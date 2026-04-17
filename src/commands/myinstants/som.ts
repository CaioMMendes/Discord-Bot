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
  AutocompleteInteraction,
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

type AutocompleteType = {
  client: Client<boolean>;
  interaction: AutocompleteInteraction;
};

interface MyInstantsResult {
  name: string;
  sound: string;
}

function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function parseInstants(html: string): MyInstantsResult[] {
  const soundRx = /play\('(\/media\/sounds\/[^']+)',\s*'[^']+',\s*'[^']+'\)/g;
  const nameRx = /class="instant-link[^"]*">([^<]+)<\/a>/g;

  const sounds: string[] = [];
  const names: string[] = [];

  let m: RegExpExecArray | null;
  while ((m = soundRx.exec(html)) !== null) sounds.push(m[1]);
  while ((m = nameRx.exec(html)) !== null) names.push(m[1].trim());

  return sounds.map((sound, i) => ({ name: names[i] ?? sound, sound }));
}

function fetchStream(url: string): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const get = url.startsWith("https") ? https.get : http.get;
    get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
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
        .setDescription("Pesquise o nome do efeito sonoro")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  autocomplete: async ({ interaction }: AutocompleteType) => {
    const termo = interaction.options.getFocused().trim();
    if (!termo) return interaction.respond([]);

    try {
      const query = encodeURIComponent(termo);
      const html = await fetchHtml(
        `https://www.myinstants.com/en/search/?name=${query}`
      );

      const instants = parseInstants(html).slice(0, 25);
      const sugestoes = instants.map((item) => ({
        name: item.name.slice(0, 100),
        value: `https://www.myinstants.com${item.sound}`,
      }));

      await interaction.respond(sugestoes);
    } catch {
      await interaction.respond([]);
    }
  },

  execute: async ({ interaction }: ExecuteType) => {
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

    const valor = interaction.options.getString("nome", true);
    const url = valor.startsWith("https://")
      ? valor
      : `https://www.myinstants.com/media/sounds/${valor.toLowerCase().trim().replace(/ /g, "-")}.mp3`;

    const nomeExibido = url.split("/").pop()?.replace(".mp3", "") ?? valor;

    await interaction.deferReply();

    let connection = getVoiceConnection(interaction.guildId!);
    let createdConnection = false;

    try {
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

      embed.setTitle(`🔊 Tocando: **${nomeExibido}**`).setColor(greenColor);
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
        .setTitle(`❌ Não foi possível tocar **${nomeExibido}**.`)
        .setDescription(`Verifique o nome em [myinstants.com](https://www.myinstants.com).`)
        .setColor(redColor);
      return await interaction.editReply({ embeds: [embed] });
    }
  },
};
