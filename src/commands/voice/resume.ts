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
    .setName("resume")
    .setDescription("Retoma a música pausada."),

  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return;

    const embed = new EmbedBuilder();
    const queue = client.player.nodes.get(interaction.guildId!);

    if (!queue) {
      embed.setTitle("❌ Não há nenhuma música na fila.").setColor(redColor);
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!queue.node.isPaused()) {
      embed.setTitle("⚠️ A música não está pausada. Use `/pause` para pausar.").setColor(redColor);
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    queue.node.resume();

    embed
      .setTitle(`▶️ Retomado: **${queue.currentTrack?.title}**`)
      .setColor(greenColor);

    return await interaction.reply({ embeds: [embed] });
  },
};
