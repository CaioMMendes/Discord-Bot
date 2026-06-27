import { Readable, PassThrough } from "node:stream"
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

interface EnsureConnectionOptions {
  guildId: string
  /** Canal de voz onde tocar (necessário se o bot ainda não estiver conectado). */
  channelId?: string
  adapterCreator: any
}

export interface VoiceConnectionResult {
  connection: VoiceConnection
  /** true quando tivemos que (re)entrar na sala agora — a conexão ainda está "aquecendo". */
  justConnected: boolean
}

interface PlayOnConnectionOptions {
  connection: VoiceConnection
  justConnected: boolean
  stream: Readable
  /** Tipo do stream de entrada. Padrão: Arbitrary (deixa o discord-voip transcodar). */
  inputType?: StreamType
}

interface PlayStreamOptions extends EnsureConnectionOptions {
  stream: Readable
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

// PCM s16le 48kHz estéreo → 48000 amostras * 2 canais * 2 bytes = 192000 bytes/s
const PCM_BYTES_PER_SECOND = 192000

/**
 * Prepende silêncio (PCM Raw) ao início do stream. Quando o bot acabou de
 * entrar na sala, o Discord descarta os primeiros pacotes de áudio até a fala
 * (SSRC) ser registrada nos clientes — num som curto isso engole o clipe
 * inteiro e ele sai mudo. O silêncio carrega esses pacotes de aquecimento.
 */
function prependSilence(stream: Readable, ms: number): Readable {
  const bytes = Math.floor((PCM_BYTES_PER_SECOND * ms) / 1000)
  const out = new PassThrough()
  out.write(Buffer.alloc(bytes))
  stream.on("error", (err) => out.destroy(err))
  stream.pipe(out)
  return out
}

/**
 * Garante uma conexão de voz pronta na sala (reaproveitando a existente).
 * Pode ser chamada em paralelo com o preparo do áudio pra esconder a latência
 * do handshake de voz atrás do download/normalização do som.
 */
export async function ensureVoiceConnection({
  guildId,
  channelId,
  adapterCreator,
}: EnsureConnectionOptions): Promise<VoiceConnectionResult> {
  let connection = getVoiceConnection(guildId)
  const status = connection?.state.status
  let justConnected = false

  if (!connection || status === VoiceConnectionStatus.Destroyed) {
    // Sem conexão (ou já destruída) → cria do zero.
    if (!channelId) throw new Error("Bot não está conectado e nenhum canal de voz foi informado")
    connection = await connectWithRetry(channelId, guildId, adapterCreator)
    justConnected = true
  } else if (status === VoiceConnectionStatus.Disconnected) {
    // Tirado da sala manualmente: a conexão fica em Disconnected, não some.
    // rejoin() reaproveita o adapter e re-entra — destruir + joinVoiceChannel
    // na mesma guild costuma travar, por isso usamos rejoin primeiro.
    if (!channelId) throw new Error("Bot não está conectado e nenhum canal de voz foi informado")
    connection.rejoin({ channelId, selfDeaf: true, selfMute: false })
    justConnected = true
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
    justConnected = true
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000)
    } catch {
      connection.destroy()
      if (!channelId) throw new Error("Bot não está conectado e nenhum canal de voz foi informado")
      connection = await connectWithRetry(channelId, guildId, adapterCreator)
    }
  }

  return { connection, justConnected }
}

/**
 * Toca o stream numa conexão já garantida. Mantém o bot no canal após terminar.
 */
export async function playOnConnection({
  connection,
  justConnected,
  stream,
  inputType,
}: PlayOnConnectionOptions): Promise<void> {
  // Conexão recém-criada ainda está "aquecendo": os primeiros pacotes são
  // descartados pelo Discord. Prependemos silêncio (só faz sentido em PCM Raw)
  // pra que sons curtos não saiam mudos.
  if (justConnected && (inputType ?? StreamType.Arbitrary) === StreamType.Raw) {
    stream = prependSilence(stream, 700)
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
  const { connection, justConnected } = await ensureVoiceConnection({
    guildId,
    channelId,
    adapterCreator,
  })
  await playOnConnection({ connection, justConnected, stream, inputType })
}
