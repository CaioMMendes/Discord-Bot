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
    .setName("skip")
    .setDescription("Pula a música atual."),

  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return;

    const embed = new EmbedBuilder();
    const queue = client.player.nodes.get(interaction.guildId!);

    if (!queue || !queue.isPlaying()) {
      embed.setTitle("❌ Não há nenhuma música tocando.").setColor(redColor);
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const currentTrack = queue.currentTrack!;
    queue.node.skip();

    embed
      .setDescription(`⏭️ Pulou **[${currentTrack.title}](${currentTrack.url})**.`)
      .setThumbnail(currentTrack.thumbnail)
      .setColor(greenColor);

    return await interaction.reply({ embeds: [embed] });
  },
};
