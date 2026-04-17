import { QueueRepeatMode } from "discord-player";
import {
  CacheType,
  Client,
  EmbedBuilder,
  GuildMember,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { greenColor, redColor, zincColor } from "../../utils/colors";

type ExecuteType = {
  client: Client<boolean>;
  interaction: Interaction<CacheType>;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Toca uma música no canal de voz.")
    .addSubcommand((sub) =>
      sub
        .setName("buscar")
        .setDescription("Busca uma música pelo nome.")
        .addStringOption((opt) =>
          opt
            .setName("termo")
            .setDescription("Nome ou palavra-chave da música")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("musica")
        .setDescription("Toca uma música pelo link do YouTube.")
        .addStringOption((opt) =>
          opt.setName("url").setDescription("URL da música no YouTube").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("playlist")
        .setDescription("Toca uma playlist do YouTube.")
        .addStringOption((opt) =>
          opt.setName("url").setDescription("URL da playlist no YouTube").setRequired(true)
        )
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

    const embedLoading = new EmbedBuilder().setTitle("🔍 Buscando...").setColor(zincColor);
    await interaction.reply({ embeds: [embedLoading] });

    const subcommand = interaction.options.getSubcommand();
    const query =
      subcommand === "buscar"
        ? interaction.options.getString("termo", true)
        : interaction.options.getString("url", true);

    try {
      const { track } = await client.player.play(voiceChannel, query, {
        requestedBy: interaction.user,
        nodeOptions: {
          volume: 60,
          leaveOnEmpty: true,
          leaveOnEnd: false,
          leaveOnStop: false,
          repeatMode: QueueRepeatMode.OFF,
        },
      });

      embed
        .setDescription(`▶️ Adicionado **[${track.title}](${track.url})** à fila.`)
        .setThumbnail(track.thumbnail)
        .setFooter({ text: `Duração: ${track.duration} • Pedido por ${interaction.user.displayName}` })
        .setColor(greenColor);

      return await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      embed
        .setTitle("❌ Não foi possível encontrar ou tocar essa música.")
        .setColor(redColor);
      return await interaction.editReply({ embeds: [embed] });
    }
  },
};
