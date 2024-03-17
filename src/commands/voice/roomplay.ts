import { QueryType, QueueRepeatMode } from "discord-player";
import {
  CacheType,
  Client,
  SlashCommandBuilder,
  Interaction,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import {
  getVoiceConnection,
  getVoiceConnections,
  joinVoiceChannel,
} from "@discordjs/voice";

type ExecuteType = {
  client: Client<boolean>;
  interaction: Interaction<CacheType>;
};

//Não pode ter letra maiuscula no name

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roomplay")
    .setDescription("Plays a song.")

    .addSubcommand((subcommand) =>
      subcommand
        .setName("song")
        .setDescription("Plays song from youtube.")
        .addChannelOption((option) =>
          option
            .setName("voicechannel")
            .setDescription("roomid, url of the song")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice)
        )
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("roomid, url of the song")
            .setRequired(true)
        )
    ),

  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return; //todo se der erro voltar para isCommand

    try {
      if (interaction.options.getSubcommand() === "song") {
        // let roomidWithUrl = interaction.options
        //   .getString("roomidurl")
        //   ?.split(",")!;
        // let roomid = `<#${roomidWithUrl[0]}>`;
        const url = interaction.options.getString("url");
        const voiceChannel = interaction.options.getChannel("voicechannel")!;
        const guildId = interaction.guildId!;
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guildId,
          adapterCreator: interaction.guild?.voiceAdapterCreator!,
        });
        const getVoiceConnection = getVoiceConnections().get(guildId);
        const queue = await client.player.nodes.create(
          interaction.guild,
          getVoiceConnection
        );

        if (!queue.connection) await queue.connect(voiceChannel.id);

        let embed = new EmbedBuilder();
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
            voiceChannel.id,
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
      }
    } catch (error) {
      console.log(error);
      await interaction.reply(
        "Ocorreu um erro ao tentar executar este comando."
      );
    }
  },
};
