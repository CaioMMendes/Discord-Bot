import {
  CacheType,
  Client,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { greenColor, redColor } from "../../utils/colors";

type ExecuteType = {
  client: Client<boolean>;
  interaction: Interaction<CacheType>;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sair")
    .setDescription("Para a música e desconecta o bot do canal de voz."),

  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return;

    const embed = new EmbedBuilder();
    const queue = client.player.nodes.get(interaction.guildId!);

    if (!queue) {
      embed.setTitle("❌ Não estou conectado a nenhum canal de voz.").setColor(redColor);
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    queue.delete();

    embed.setTitle("👋 Desconectado do canal de voz.").setColor(greenColor);
    return await interaction.reply({ embeds: [embed] });
  },
};
