import { Readable } from "node:stream"
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  VoiceConnectionStatus,
  entersState,
  AudioPlayerStatus,
  getVoiceConnection,
  VoiceConnection,
} from "discord-voip"

interface PlayStreamOptions {
  guildId: string
  /** Canal de voz onde tocar (necessário se o bot ainda não estiver conectado). */
  channelId?: string
  adapterCreator: any
  stream: Readable
  /** Tipo do stream de entrada. Padrão: Arbitrary (deixa o discord-voip transcodar). */
  inputType?: StreamType
}

async function connectWithRetry(
  channelId: string,
  guildId: string,
  adapterCreator: any
): Promise<VoiceConnection> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    const connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator,
      selfDeaf: true,
    })
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000)
      return connection
    } catch (err) {
      lastErr = err
      connection.destroy()
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Falha ao conectar ao canal de voz")
}

/**
 * Conecta ao canal de voz (reaproveitando conexão existente) e toca o stream.
 * Mantém o bot no canal após terminar.
 */
export async function playStreamInChannel({
  guildId,
  channelId,
  adapterCreator,
  stream,
  inputType,
}: PlayStreamOptions): Promise<void> {
  let connection = getVoiceConnection(guildId)

  if (!connection) {
    if (!channelId) throw new Error("Bot não está conectado e nenhum canal de voz foi informado")
    connection = await connectWithRetry(channelId, guildId, adapterCreator)
  }

  const resource = createAudioResource(stream, {
    inputType: inputType ?? StreamType.Arbitrary,
    inlineVolume: false,
  })

  const audioPlayer = createAudioPlayer()

  audioPlayer.on("error", (err) => {
    console.error(`[play-stream] Erro no player: ${err.message}`)
  })

  connection.subscribe(audioPlayer)
  audioPlayer.play(resource)

  await entersState(audioPlayer, AudioPlayerStatus.Playing, 15_000)

  audioPlayer.on(AudioPlayerStatus.Idle, () => {
    audioPlayer.stop()
    // Não destrói a conexão — mantém o bot no canal
  })
}
