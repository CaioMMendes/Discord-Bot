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
    if (!interaction.isChatInputCommand())
      return await interaction.channel!.send("Não é um comando de chat.");
    try {
      if (!interaction.isChatInputCommand()) return;
      const queue = client.player.nodes.get(interaction.guild);

      const testandoQueue = client.player.nodes.get(queue);
      console.log(testandoQueue);
      //todo ver se tem alguma diferença entre o queue e o testando queue
      if (!queue) {
        await interaction.reply("Não existe nenhum som tocando.");
        return;
      }
      const currentSong = queue.currentTrack;
      //todo debugar o testando queue para ver se tem o .skip()
      //todo para passar o nodes.get() ele recebe um node ali eu to passando um guild

      //   console.log(queue);
      //   queue.skip();
      //   client.player.nodes.playerSkip(queue, currentSong);

      return await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`Skipped **${currentSong.title}**`)
            .setThumbnail(currentSong.setThumbnail),
        ],
      });
    } catch (error) {
      console.log(error);
      return await interaction.reply(
        "Ocorreu um erro ao tentar executar este comando."
      );
    }
  },
};
