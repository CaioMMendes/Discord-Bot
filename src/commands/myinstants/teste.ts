import { QueryType, QueueRepeatMode } from "discord-player";
import {
  CacheType,
  Client,
  SlashCommandBuilder,
  Interaction,
  EmbedBuilder,
} from "discord.js";
import { greenColor, redColor } from "../../utils/colors";

type ExecuteType = {
  client: Client<boolean>;
  interaction: Interaction<CacheType>;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("teste")
    .setDescription("Plays a song.")
    .addStringOption((option) =>
      option.setName("name").setDescription("Nome do efeito").setRequired(true)
    ),

  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand())
      return await interaction.channel!.send("Não é um comando de chat."); //todo se der erro voltar para isCommand
    const memberInteraction = interaction?.member as any;
    let embed = new EmbedBuilder();
    try {
      if (!memberInteraction?.voice?.channel) {
        embed
          .setTitle(
            "❌ Você precisa estar em um canal de voz para usar esse comando"
          )
          .setColor(redColor);
        return await interaction.reply({ embeds: [embed] });
      }

      const queue = await client.player.nodes.create(interaction.guild, {
        // audioPlayerOptions: { queue: true },
        // nodeOptions: {
        repeatMode: QueueRepeatMode.OFF,
        leaveOnStop: false,
        leaveOnEnd: false,
        leaveOnEmpty: true,
        volume: 60,

        // },
      });

      if (!queue.connection)
        await queue.connect(memberInteraction.voice.channel);

      let name = interaction.options
        .getString("name")
        ?.toLocaleLowerCase()
        .trim()
        .replace(/ /g, "-");
      const url = `https://www.myinstants.com/media/sounds/${name}.mp3`;
      console.log("url", url);
      const result = await client.player.search(url, {
        requestBy: interaction.user,
        searchEngine: QueryType.AUTO,
      });
      if (result.tracks.length === 0) {
        embed
          .setTitle(`❌ Não foi possivel encontrar um audio nessa url:${url}.`)
          .setColor(redColor);
        return await interaction.reply({ embeds: [embed] });
      }

      const song = result.tracks[0];
      console.log("🛺song", song.url);

      await queue.addTrack(song);

      embed
        .setTitle(`Added **[${song?.title}](${song?.url})** to the queue.`)
        .setThumbnail(song?.thumbnail)
        .setColor(greenColor);

      console.log(queue.tracks.data.length);
      if (!queue.isPlaying()) {
        // console.log(await queue.play);
        // return await queue?.play();
        //todo https://www.myinstants.com/media/sounds/minecraft-drinking-sound-effect.mp3 url base para usar
        //todo eu to dando um play direito, sem passar o queue, por isso deve ta dando problema
        await client.player.play(
          memberInteraction.voice.channel,
          queue.tracks.data
        );
      }

      return await interaction.reply({
        embeds: [embed],
      });
    } catch (error) {
      console.log(error);
      embed
        .setTitle("❌ Ocorreu um erro ao tentar executar este comando.")
        .setColor(redColor);
      return await interaction.reply({ embeds: [embed] });
    }
  },
};
