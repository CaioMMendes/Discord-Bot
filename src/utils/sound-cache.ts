import { createReadStream, createWriteStream } from "node:fs"
import { mkdir, readdir, rename, stat, unlink, utimes } from "node:fs/promises"
import { join } from "node:path"
import { PassThrough, Readable } from "node:stream"
import { getSoundStream } from "./drive"
import { normalizeToPcm } from "./normalize-audio"

// Cache do PCM já normalizado. Num clique repetido (bot já na sala) não há ida
// ao Drive nem ffmpeg — só abre o arquivo e toca, então o som sai quase na hora.
//
// Fica no disco do container (não no /tmp, que em alguns hosts é tmpfs/RAM),
// pra não consumir a RAM — importante no plano de 1GB da Discloud.
const CACHE_DIR = join(process.cwd(), ".sound-cache")

// Teto do cache. PCM é maior que o original, mas clipes de meme são curtos.
// LRU evita estourar o disco: os menos usados são apagados primeiro.
const MAX_CACHE_BYTES = 120 * 1024 * 1024 // 120 MB

let dirReady = false
async function ensureCacheDir(): Promise<void> {
  if (dirReady) return
  await mkdir(CACHE_DIR, { recursive: true })
  dirReady = true
}

// fileId do Drive só tem letras, dígitos, _ e - → seguro como nome de arquivo.
function cachePath(fileId: string): string {
  return join(CACHE_DIR, `${fileId}.pcm`)
}

/**
 * Devolve o PCM normalizado (s16le 48kHz estéreo, pra tocar com StreamType.Raw)
 * de um som do Drive, usando cache em disco. Na primeira vez baixa + normaliza
 * e grava no cache em paralelo; nas próximas lê direto do disco.
 */
export async function getNormalizedPcm(fileId: string): Promise<Readable> {
  await ensureCacheDir()
  const path = cachePath(fileId)

  try {
    const st = await stat(path)
    if (st.size > 0) {
      // Marca como usado agora (LRU por mtime).
      const now = new Date()
      utimes(path, now, now).catch(() => {})
      return createReadStream(path)
    }
  } catch {
    /* cache miss */
  }

  const driveStream = await getSoundStream(fileId)
  const normalized = normalizeToPcm(driveStream)
  return teeToCache(normalized, path)
}

/**
 * Repassa o stream pro chamador e, em paralelo, grava num arquivo temporário
 * que vira o cache ao terminar. Se a gravação falhar, a reprodução não é
 * afetada — só não fica cacheado.
 */
function teeToCache(source: Readable, finalPath: string): Readable {
  const tmpPath = `${finalPath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  const passthrough = new PassThrough()
  const fileOut = createWriteStream(tmpPath)

  let cacheAborted = false
  const abortCache = () => {
    if (cacheAborted) return
    cacheAborted = true
    source.unpipe(fileOut)
    fileOut.destroy()
    unlink(tmpPath).catch(() => {})
  }

  fileOut.on("error", abortCache)
  source.on("error", (err) => {
    abortCache()
    passthrough.destroy(err)
  })

  fileOut.on("finish", () => {
    if (cacheAborted) return
    // ffmpeg pode ter falhado e fechado sem dados — não cacheia arquivo vazio.
    if (fileOut.bytesWritten === 0) {
      unlink(tmpPath).catch(() => {})
      return
    }
    rename(tmpPath, finalPath)
      .then(() => enforceCacheLimit())
      .catch(() => unlink(tmpPath).catch(() => {}))
  })

  source.pipe(fileOut)
  source.pipe(passthrough)
  return passthrough
}

/** Apaga os arquivos menos usados até o cache caber em MAX_CACHE_BYTES. */
async function enforceCacheLimit(): Promise<void> {
  let files: string[]
  try {
    files = await readdir(CACHE_DIR)
  } catch {
    return
  }

  const entries: { path: string; size: number; mtime: number }[] = []
  let total = 0
  const tmpStaleBefore = Date.now() - 10 * 60 * 1000
  for (const name of files) {
    const full = join(CACHE_DIR, name)
    // Restos de gravações interrompidas (playback parou no meio) — limpa os antigos.
    if (name.endsWith(".tmp")) {
      try {
        const st = await stat(full)
        if (st.mtimeMs < tmpStaleBefore) await unlink(full)
      } catch {
        /* já apagado */
      }
      continue
    }
    if (!name.endsWith(".pcm")) continue
    try {
      const st = await stat(full)
      entries.push({ path: full, size: st.size, mtime: st.mtimeMs })
      total += st.size
    } catch {
      /* sumiu no meio do caminho */
    }
  }

  if (total <= MAX_CACHE_BYTES) return

  entries.sort((a, b) => a.mtime - b.mtime) // mais antigos (menos usados) primeiro
  for (const entry of entries) {
    if (total <= MAX_CACHE_BYTES) break
    try {
      await unlink(entry.path)
      total -= entry.size
    } catch {
      /* já apagado */
    }
  }
}
