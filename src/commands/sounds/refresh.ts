import {
  CacheType,
  Client,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js"
import { greenColor, redColor } from "../../utils/colors"
import { listSounds } from "../../utils/drive"
import { syncPanels } from "../../utils/sound-panel"

type ExecuteType = {
  client: Client<boolean>
  interaction: Interaction<CacheType>
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("refresh")
    .setDescription("Re-sincroniza os botões de sons com os arquivos do Google Drive."),

  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return

    await interaction.deferReply({ ephemeral: true })
    const embed = new EmbedBuilder()

    try {
      const sounds = await listSounds()
      await syncPanels(client)

      embed
        .setTitle("🔄 Painéis atualizados!")
        .setDescription(`**${sounds.length}** som(ns) disponível(eis) no Drive.`)
        .setColor(greenColor)
      await interaction.editReply({ embeds: [embed] })
    } catch (err: any) {
      embed
        .setTitle("❌ Erro ao re-sincronizar os sons.")
        .setDescription(`\`${err?.message ?? err}\``)
        .setColor(redColor)
      await interaction.editReply({ embeds: [embed] })
    }
  },
}
