import { spawn } from "node:child_process"
import { Readable } from "node:stream"
import ffmpegStatic from "ffmpeg-static"

const ffmpegPath = (ffmpegStatic as unknown as string) || "ffmpeg"

// Normalização dinâmica, quadro a quadro. Diferente do `loudnorm`, não tem
// lookahead grande — começa a soltar áudio na hora, o que evita o primeiro som
// sair mudo e funciona bem com clipes curtos (memes).
//   f = tamanho do quadro (ms)   g = suavização entre quadros
//   p = pico-alvo (0..1)         m = ganho máximo (boost dos sons baixinhos)
const NORMALIZE_FILTER = "dynaudnorm=f=150:g=15:p=0.9:m=15"

/**
 * Recebe um stream de áudio em qualquer formato e devolve PCM s16le 48kHz
 * estéreo com volume normalizado — sons estourados são abaixados e os
 * baixinhos levantados, todos saindo num volume parecido.
 *
 * O resultado deve ser tocado com `StreamType.Raw`.
 */
export function normalizeToPcm(input: Readable): Readable {
  const ff = spawn(
    ffmpegPath,
    [
      "-i", "pipe:0",
      "-af", NORMALIZE_FILTER,
      "-f", "s16le",
      "-ar", "48000",
      "-ac", "2",
      "pipe:1",
    ],
    { stdio: ["pipe", "pipe", "ignore"] }
  )

  ff.on("error", (err) => {
    console.error(`[normalize] Falha ao iniciar o ffmpeg: ${err.message}`)
    input.destroy()
  })

  input.on("error", (err) => {
    console.error(`[normalize] Erro no stream de entrada: ${err.message}`)
    ff.stdout.destroy()
  })

  // EPIPE acontece quando o ffmpeg fecha a entrada antes do input terminar — ignorável
  ff.stdin.on("error", () => {})

  input.pipe(ff.stdin)

  return ff.stdout
}
