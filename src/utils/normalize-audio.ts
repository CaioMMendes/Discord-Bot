import { spawn } from "node:child_process"
import { Readable } from "node:stream"
import ffmpegStatic from "ffmpeg-static"

const ffmpegPath = (ffmpegStatic as unknown as string) || "ffmpeg"

// Alvo de loudness padrão (EBU R128). I = loudness integrado em LUFS,
// TP = true peak máximo, LRA = faixa de loudness.
const LOUDNORM_FILTER = "loudnorm=I=-16:TP=-1.5:LRA=11"

/**
 * Recebe um stream de áudio em qualquer formato e devolve PCM s16le 48kHz
 * estéreo com `loudnorm` aplicado — sons estourados são abaixados e os
 * baixinhos levantados, todos saindo no mesmo volume.
 *
 * O resultado deve ser tocado com `StreamType.Raw`.
 */
export function normalizeToPcm(input: Readable): Readable {
  const ff = spawn(
    ffmpegPath,
    [
      "-i", "pipe:0",
      "-af", LOUDNORM_FILTER,
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
