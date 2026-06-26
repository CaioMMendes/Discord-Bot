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
  VoiceConnection,
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

function fetchHtml(url: string, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("fetchHtml timeout"));
    });
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

function fetchStream(url: string, redirectCount = 0): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error("Muitos redirecionamentos"));
    const get = url.startsWith("https") ? https.get : http.get;
    get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchStream(res.headers.location!, redirectCount + 1).then(resolve).catch(reject);
      } else if (res.statusCode === 200) {
        resolve(res);
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    }).on("error", reject);
  });
}

async function connectToVoice(
  channelId: string,
  guildId: string,
  adapterCreator: any,
  attempt: number
): Promise<VoiceConnection> {
  console.log(`[som] Tentativa ${attempt}: criando joinVoiceChannel...`);

  const connection = joinVoiceChannel({
    channelId,
    guildId,
    adapterCreator,
    selfDeaf: true,
  });

  // Log every state transition — key diagnostic info
  connection.on("stateChange", (oldState, newState) => {
    console.log(`[som][tentativa ${attempt}] Estado: ${oldState.status} -> ${newState.status}`);
  });

  // Log the state after 3 seconds — tells us where it's stuck
  const diagTimer = setTimeout(() => {
    console.log(
      `[som][tentativa ${attempt}] Estado aos 3s: "${connection.state.status}" ` +
      `(Signalling=gateway não respondeu, Connecting=UDP falhou)`
    );
  }, 3000);

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    clearTimeout(diagTimer);
    console.log(`[som][tentativa ${attempt}] Conexão READY!`);
    return connection;
  } catch (err: any) {
    clearTimeout(diagTimer);
    console.error(
      `[som][tentativa ${attempt}] Timeout — estado final: "${connection.state.status}" | ${err.message}`
    );
    connection.destroy();
    throw err;
  }
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
      const html = await fetchHtml(`https://www.myinstants.com/en/search/?name=${query}`);
      const instants = parseInstants(html).slice(0, 25);
      const sugestoes = instants.map((item) => ({
        name: item.name.slice(0, 100),
        value: `https://www.myinstants.com${item.sound}`,
      }));
      await interaction.respond(sugestoes);
    } catch (err: any) {
      console.error(`[som][autocomplete] Erro: ${err.message}`);
      await interaction.respond([]);
    }
  },

  execute: async ({ interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return;

    console.log(`[som][v4] Iniciado por ${interaction.user.tag} | Node: ${process.version} | Plataforma: ${process.platform}`);

    const member = interaction.member as GuildMember;
    const userChannel = member?.voice?.channel;
    const embed = new EmbedBuilder();

    const existingConnection = getVoiceConnection(interaction.guildId!);
    console.log(`[som] Canal do usuário: ${userChannel?.id ?? "nenhum"} | Conexão existente: ${existingConnection ? `sim (${existingConnection.state.status})` : "não"}`);

    if (!userChannel && !existingConnection) {
      embed
        .setTitle("❌ Você precisa estar em um canal de voz ou o bot precisa já estar em um.")
        .setColor(redColor);
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const valor = interaction.options.getString("nome", true);
    const url = valor.startsWith("https://")
      ? valor
      : `https://www.myinstants.com/media/sounds/${valor.toLowerCase().trim().replace(/ /g, "-")}.mp3`;

    const nomeExibido = url.split("/").pop()?.replace(".mp3", "") ?? valor;
    console.log(`[som] URL: ${url}`);

    await interaction.deferReply();

    let connection: VoiceConnection | undefined = existingConnection;
    let createdConnection = false;

    try {
      // Fetch the audio stream first
      console.log(`[som] Buscando stream de áudio...`);
      let stream: http.IncomingMessage;
      try {
        stream = await fetchStream(url);
        console.log(`[som] Stream OK — Content-Type: ${stream.headers["content-type"]}`);
      } catch (fetchErr: any) {
        console.error(`[som] Falha ao buscar áudio: ${fetchErr.message}`);
        embed
          .setTitle(`❌ Não foi possível baixar o áudio.`)
          .setDescription(`\`${fetchErr.message}\`\nURL: \`${url}\``)
          .setColor(redColor);
        return await interaction.editReply({ embeds: [embed] });
      }

      // Establish voice connection (with retry)
      if (!connection) {
        createdConnection = true;
        let lastErr: any;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            connection = await connectToVoice(
              userChannel!.id,
              interaction.guildId!,
              interaction.guild!.voiceAdapterCreator,
              attempt
            );
            break; // success
          } catch (err: any) {
            lastErr = err;
            if (attempt < 3) {
              console.log(`[som] Aguardando 2s antes da próxima tentativa...`);
              await new Promise((r) => setTimeout(r, 2000));
            }
          }
        }

        if (!connection) {
          embed
            .setTitle(`❌ Não foi possível conectar ao canal de voz após 3 tentativas.`)
            .setDescription(`Estado da última tentativa nos logs. Erro: \`${lastErr?.message}\``)
            .setColor(redColor);
          return await interaction.editReply({ embeds: [embed] });
        }
      }

      // Play the audio
      console.log(`[som] Criando AudioResource e Player...`);
      const resource = createAudioResource(stream!, {
        inputType: StreamType.Arbitrary,
        inlineVolume: false,
      });

      const audioPlayer = createAudioPlayer();

      audioPlayer.on("stateChange", (oldState, newState) => {
        console.log(`[som][player] ${oldState.status} -> ${newState.status}`);
      });

      audioPlayer.on("error", (err: AudioPlayerError) => {
        console.error(`[som][player] Erro: ${err.message}`);
        if (createdConnection) connection?.destroy();
      });

      connection.subscribe(audioPlayer);
      audioPlayer.play(resource);

      try {
        await entersState(audioPlayer, AudioPlayerStatus.Playing, 15_000);
        console.log(`[som][player] Reprodução iniciada!`);
      } catch (playErr: any) {
        console.error(`[som][player] Timeout aguardando Playing: ${playErr.message}`);
        if (createdConnection) connection?.destroy();
        embed
          .setTitle(`❌ Não foi possível iniciar a reprodução.`)
          .setDescription(`\`${playErr.message}\``)
          .setColor(redColor);
        return await interaction.editReply({ embeds: [embed] });
      }

      embed.setTitle(`🔊 Tocando: **${nomeExibido}**`).setColor(greenColor);
      await interaction.editReply({ embeds: [embed] });

      audioPlayer.on(AudioPlayerStatus.Idle, () => {
        console.log(`[som][player] Reprodução concluída`);
        audioPlayer.stop();
        // Do not destroy connection — keep the bot in the channel
      });
    } catch (error: any) {
      console.error(`[som] Erro inesperado: ${error.message}`, error);
      if (createdConnection) connection?.destroy();
      embed
        .setTitle(`❌ Erro ao reproduzir o som.`)
        .setDescription(`\`${error.message}\``)
        .setColor(redColor);
      return await interaction.editReply({ embeds: [embed] });
    }
  },
};
