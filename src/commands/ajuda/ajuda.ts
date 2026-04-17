import {
  CacheType,
  Client,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { zincColor } from "../../utils/colors";

type ExecuteType = {
  client: Client<boolean>;
  interaction: Interaction<CacheType>;
};

const comandos = [
  {
    categoria: "🎵 Música",
    itens: [
      { nome: "/play buscar [termo]", desc: "Busca uma música pelo nome e toca no canal de voz." },
      { nome: "/play musica [url]", desc: "Toca uma música pelo link do YouTube." },
      { nome: "/play playlist [url]", desc: "Toca uma playlist do YouTube." },
      { nome: "/skip", desc: "Pula a música que está tocando." },
      { nome: "/pause", desc: "Pausa a música atual." },
      { nome: "/resume", desc: "Retoma a música pausada." },
      { nome: "/fila", desc: "Mostra as músicas na fila." },
      { nome: "/sair", desc: "Para a música e desconecta o bot do canal de voz." },
      { nome: "/sala [canal]", desc: "Faz o bot entrar em um canal de voz específico." },
    ],
  },
  {
    categoria: "🔊 Sons",
    itens: [
      { nome: "/som [nome]", desc: "Toca um efeito sonoro do myinstants.com no canal de voz." },
    ],
  },
  {
    categoria: "🎮 Diversão",
    itens: [
      { nome: "/mover [canal1] [canal2]", desc: "Move um usuário entre dois canais de voz repetidamente." },
      { nome: "/oi", desc: "Receba um oi do Pituim!" },
    ],
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ajuda")
    .setDescription("Lista todos os comandos disponíveis e o que cada um faz."),

  execute: async ({ interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return;

    const embed = new EmbedBuilder()
      .setTitle("📋 Comandos disponíveis")
      .setColor(zincColor)
      .setFooter({ text: "Use os comandos com / no chat" });

    for (const categoria of comandos) {
      const valor = categoria.itens
        .map((c) => `**${c.nome}**\n${c.desc}`)
        .join("\n\n");
      embed.addFields({ name: categoria.categoria, value: valor });
    }

    return await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
