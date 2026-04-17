import https from "https";
import http from "http";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  VoiceConnectionStatus,
  entersState,
  AudioPlayerStatus,
  AudioPlayerError,
  getVoiceConnection,
} from "discord-voip";
import {
  CacheType,
  Client,
  EmbedBuilder,
  GuildMember,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { greenColor, redColor } from "../../utils/colors";

type ExecuteType = {
  client: Client<boolean>;
  interaction: Interaction<CacheType>;
};

function fetchStream(url: string): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const get = url.startsWith("https") ? https.get : http.get;
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchStream(res.headers.location!).then(resolve).catch(reject);
      } else if (res.statusCode === 200) {
        resolve(res);
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    }).on("error", reject);
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("som")
    .setDescription("Toca um efeito sonoro do myinstants no canal de voz.")
    .addStringOption((option) =>
      option
        .setName("nome")
        .setDescription("Nome do efeito (ex: vine-boom, bruh, among-us)")
        .setRequired(true)
    ),

  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return;

    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;
    const embed = new EmbedBuilder();

    if (!voiceChannel) {
      embed
        .setTitle("❌ Você precisa estar em um canal de voz para usar esse comando.")
        .setColor(redColor);
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const nome = interaction.options
      .getString("nome", true)
      .toLowerCase()
      .trim()
      .replace(/ /g, "-");

    const url = `https://www.myinstants.com/media/sounds/${nome}.mp3`;

    await interaction.deferReply();

    let connection = getVoiceConnection(interaction.guildId!);
    let createdConnection = false;

    try {
      // Busca o stream antes de entrar na sala, para validar que o som existe
      const stream = await fetchStream(url);

      if (!connection) {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guildId!,
          adapterCreator: interaction.guild!.voiceAdapterCreator,
          selfDeaf: true,
        });
        createdConnection = true;
      }

      await entersState(connection, VoiceConnectionStatus.Ready, 10_000);

      const resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
      });

      const audioPlayer = createAudioPlayer();
      connection.subscribe(audioPlayer);
      audioPlayer.play(resource);

      await entersState(audioPlayer, AudioPlayerStatus.Playing, 10_000);

      embed.setTitle(`🔊 Tocando: **${nome}**`).setColor(greenColor);
      await interaction.editReply({ embeds: [embed] });

      audioPlayer.on(AudioPlayerStatus.Idle, () => {
        audioPlayer.stop();
        if (!createdConnection) return;
        const hasMembers = voiceChannel.members.some((m) => !m.user.bot);
        if (!hasMembers) connection?.destroy();
      });

      audioPlayer.on("error", (err: AudioPlayerError) => {
        console.error("[som] AudioPlayer error:", err);
        if (createdConnection) connection?.destroy();
      });
    } catch (error: any) {
      console.error("[som] Erro:", error);
      if (createdConnection) connection?.destroy();
      embed
        .setTitle(`❌ Não foi possível tocar **${nome}**.`)
        .setDescription(`Verifique o nome em [myinstants.com](https://www.myinstants.com).`)
        .setColor(redColor);
      return await interaction.editReply({ embeds: [embed] });
    }
  },
};
