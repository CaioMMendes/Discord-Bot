import fs from "node:fs"
import path from "node:path"

// Mapa fileId -> guildId dos sons "privados" (botão visível só no servidor onde
// o arquivo foi enviado). O Drive guarda apenas o arquivo de áudio; este JSON é a
// fonte de verdade de "de quem o som é". A cada sync reconciliamos com o Drive:
// se o arquivo foi deletado lá, a entrada some daqui (ver prunePrivateMap).

const DATA_FILE =
  process.env.PRIVATE_SOUNDS_FILE ?? path.join(process.cwd(), "private-sounds.json")

type PrivateMap = Record<string, string> // fileId -> guildId

function read(): PrivateMap {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8")
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed as PrivateMap
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      console.error(
        "[private-sounds] Falha ao ler o arquivo, começando vazio:",
        err?.message ?? err
      )
    }
  }
  return {}
}

function write(map: PrivateMap): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(map, null, 2))
  } catch (err: any) {
    console.error("[private-sounds] Falha ao salvar o arquivo:", err?.message ?? err)
  }
}

/** Retorna o mapa completo fileId -> guildId dos sons privados. */
export function getPrivateMap(): PrivateMap {
  return read()
}

/** Marca um som como privado de um servidor específico. */
export function markPrivate(fileId: string, guildId: string): void {
  const map = read()
  map[fileId] = guildId
  write(map)
}

/** guildId dono do som privado, ou null se o som for público. */
export function getOwnerGuild(fileId: string): string | null {
  return read()[fileId] ?? null
}

/**
 * Remove do JSON os sons privados que não existem mais no Drive.
 * `existingIds` = ids atualmente presentes na pasta do Drive.
 */
export function prunePrivateMap(existingIds: Set<string>): void {
  const map = read()
  let changed = false
  for (const fileId of Object.keys(map)) {
    if (!existingIds.has(fileId)) {
      delete map[fileId]
      changed = true
    }
  }
  if (changed) write(map)
}
