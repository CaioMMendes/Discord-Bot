import { QueryType, QueueRepeatMode } from "discord-player";
import {
  CacheType,
  Client,
  SlashCommandBuilder,
  Interaction,
  EmbedBuilder,
} from "discord.js";

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
    const queue = client.player.nodes.get(interaction.guild);

    if (!queue) {
      await interaction.reply("Não existe nenhum som tocando.");
      return;
    }
    const currentSong = queue.currentTrack;

    // queue.playerSkip();
    client.player.nodes.playerSkip(queue, currentSong);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`Skipped **${currentSong.title}**`)
          .setThumbnail(currentSong.setThumbnail),
      ],
    });
  },
};
