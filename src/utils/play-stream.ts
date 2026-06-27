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
  const status = connection?.state.status

  if (!connection || status === VoiceConnectionStatus.Destroyed) {
    // Sem conexão (ou já destruída) → cria do zero.
    if (!channelId) throw new Error("Bot não está conectado e nenhum canal de voz foi informado")
    connection = await connectWithRetry(channelId, guildId, adapterCreator)
  } else if (status === VoiceConnectionStatus.Disconnected) {
    // Tirado da sala manualmente: a conexão fica em Disconnected, não some.
    // rejoin() reaproveita o adapter e re-entra — destruir + joinVoiceChannel
    // na mesma guild costuma travar, por isso usamos rejoin primeiro.
    if (!channelId) throw new Error("Bot não está conectado e nenhum canal de voz foi informado")
    connection.rejoin({ channelId, selfDeaf: true, selfMute: false })
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000)
    } catch {
      // rejoin não pegou → último recurso: destrói e recria do zero.
      try {
        connection.destroy()
      } catch {
        /* já destruída */
      }
      connection = await connectWithRetry(channelId, guildId, adapterCreator)
    }
  } else if (status !== VoiceConnectionStatus.Ready) {
    // Conexão existente ainda conectando — espera ficar pronta antes de tocar.
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000)
    } catch {
      connection.destroy()
      if (!channelId) throw new Error("Bot não está conectado e nenhum canal de voz foi informado")
      connection = await connectWithRetry(channelId, guildId, adapterCreator)
    }
  }

  const resource = createAudioResource(stream, {
    inputType: inputType ?? StreamType.Arbitrary,
    inlineVolume: false,
  })

  const audioPlayer = createAudioPlayer()

  audioPlayer.on("error", (err) => {
    console.error(`[play-stream] Erro no player: ${err.message}`)
  })

  connection!.subscribe(audioPlayer)
  audioPlayer.play(resource)

  await entersState(audioPlayer, AudioPlayerStatus.Playing, 15_000)

  audioPlayer.on(AudioPlayerStatus.Idle, () => {
    audioPlayer.stop()
    // Não destrói a conexão — mantém o bot no canal
  })
}
