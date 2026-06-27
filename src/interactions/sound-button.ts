import {
  ButtonInteraction,
  Client,
  EmbedBuilder,
  GuildMember,
} from "discord.js"
import { getVoiceConnection, StreamType } from "discord-voip"
import { getSoundStream } from "../utils/drive"
import { ensureVoiceConnection, playOnConnection } from "../utils/play-stream"
import { normalizeToPcm } from "../utils/normalize-audio"
import { redColor } from "../utils/colors"

type Args = {
  client: Client
  interaction: ButtonInteraction
}

/** Trata o clique em um botão de som: entra na sala e toca o arquivo do Drive. */
export async function handleSoundButton({ interaction }: Args): Promise<void> {
  const fileId = interaction.customId.slice("sound:".length)

  const member = interaction.member as GuildMember
  const userChannel = member?.voice?.channel
  const existingConnection = getVoiceConnection(interaction.guildId!)

  // Erro só visível pra quem clicou (efêmero) — não polui o canal
  if (!userChannel && !existingConnection) {
    const embed = new EmbedBuilder()
      .setTitle("❌ Entre em um canal de voz para tocar o som.")
      .setColor(redColor)
    await interaction.reply({ embeds: [embed], ephemeral: true })
    return
  }

  // Acknowledge sem enviar nada visível no canal
  await interaction.deferUpdate()

  try {
    // Conecta na call em paralelo com o download/normalização do som — o
    // handshake de voz (lento no 1º clique) fica escondido atrás do fetch.
    const connectionPromise = ensureVoiceConnection({
      guildId: interaction.guildId!,
      channelId: userChannel?.id,
      adapterCreator: interaction.guild!.voiceAdapterCreator,
    })
    // Se conectar falhar, não deixa virar unhandled rejection enquanto baixamos.
    connectionPromise.catch(() => {})

    const stream = await getSoundStream(fileId)
    // Passa pelo loudnorm pra todos os sons saírem no mesmo volume
    const normalized = normalizeToPcm(stream)

    const { connection, justConnected } = await connectionPromise
    await playOnConnection({
      connection,
      justConnected,
      stream: normalized,
      inputType: StreamType.Raw,
    })
  } catch (err: any) {
    const notFound = err?.code === 404 || /not found|file not found/i.test(err?.message ?? "")
    const embed = new EmbedBuilder()
      .setTitle(
        notFound
          ? "❌ Esse som não existe mais no Drive."
          : "❌ Não consegui tocar esse som."
      )
      .setDescription(notFound ? "Use `/refresh` para atualizar os botões." : `\`${err?.message ?? err}\``)
      .setColor(redColor)
    await interaction.followUp({ embeds: [embed], ephemeral: true })
  }
}
