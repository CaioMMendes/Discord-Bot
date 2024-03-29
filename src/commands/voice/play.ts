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

//Não pode ter letra maiuscula no name

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays a song.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("search")
        .setDescription("Searches for a song.")
        .addStringOption((option) =>
          option
            .setName("searchterms")
            .setDescription("Searches keywords.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("playlist")
        .setDescription("Plays playlist from youtube.")
        .addStringOption((option) =>
          option.setName("url").setDescription("playlist url").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("song")
        .setDescription("Plays song from youtube.")
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("url of the song")
            .setRequired(true)
        )
    ),
  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return; //todo se der erro voltar para isCommand
    const memberInteraction = interaction?.member as any;
    try {
      if (!memberInteraction?.voice?.channel) {
        await interaction.reply(
          "Você precisa estar em um canal de voz para usar esse comando"
        );
        return;
      }

      const queue = await client.player.nodes.create(
        interaction.guild,
        memberInteraction?.voice?.channel
      );

      if (!queue.connection)
        await queue.connect(memberInteraction.voice.channel);

      let embed = new EmbedBuilder();

      if (interaction.options.getSubcommand() === "song") {
        let url = interaction.options.getString("url");
        const result = await client.player.search(url, {
          requestBy: interaction.user,
          searchEngine: QueryType.YOUTUBE_VIDEO,
        });
        if (result.tracks.length === 0) {
          await interaction.reply("No results found");
          return;
        }

        const song = result.tracks[0];
        console.log("🛺song", song.url);

        await queue.addTrack(song);
        // console.log("💖", queue);

        embed
          .setDescription(
            `Added **[${song?.title}](${song?.url})** to the queue.`
          )
          .setThumbnail(song.thumbnail)
          .setFooter({ text: `Duration: ${song?.duration}` });

        if (!queue.playing) {
          // console.log(await queue.play);
          // return await queue?.play();
          //todo eu to dando um play direito, sem passar o queue, por isso deve ta dando problema
          return await client.player.play(
            memberInteraction.voice.channel,
            queue.tracks.data[queue.tracks.data.length - 1],
            {
              audioPlayerOptions: { queue: true },
              nodeOptions: {
                repeatMode: 0,
                leaveOnStop: false,
                leaveOnEnd: false,
                volume: 60,
              },
            }
          );
        }
      } else if (interaction.options.getSubcommand() === "playlist") {
        let url = interaction.options.getString("url");

        const result = await client.player.search(url, {
          requestBy: interaction.user,
          searchEngine: QueryType.YOUTUBE_PLAYLIST,
        });
        console.log(result);
        if (result.tracks.length === 0) {
          await interaction.reply("No playlist found");
          return;
        }

        const playlist = result.playlist;
        await queue.addTrack(playlist);

        embed
          .setDescription(
            `Added **[${playlist.title}](${playlist.url})** to the queue.`
          )
          .setThumbnail(playlist.thumbnail)
          .setFooter({ text: `Duration: ${playlist.duration}` });
      }
      //  else if (interaction.options.getSubcommand() === "searchterms") {
      //     let url = interaction.options.getString("url");
      //     console.log("url", url);
      //     const result = await client.player.search(url, {
      //       requestBy: interaction.user,
      //       searchEngine: QueryType.AUTO,
      //     });
      //     console.log(result);
      //     if (result.tracks.length === 0) {
      //       await interaction.reply("No results found");
      //       return;
      //     }

      //     const song = result.tracks[0];
      //     await queue.addTrack(song);

      //     embed
      //       .setDescription(
      //         `Added **[${song.title}](${song.url})** to the queue.`
      //       )
      //       .setThumbnail(song.thumbnail)
      //       .setFooter({ text: `Duration: ${song.duration}` });
      //   }
      console.log(queue.playing);
      if (!queue.playing) {
        // console.log(await queue.play);
        // return await queue?.play();
        // return await client.player.play(memberInteraction.voice.channel, song);
      }
      //   await interaction.reply({
      //     embeds: [embed],
      //   });
    } catch (error) {
      console.log(error);
      await interaction.reply(
        "Ocorreu um erro ao tentar executar este comando."
      );
    }
  },
};
