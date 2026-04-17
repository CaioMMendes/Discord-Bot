import {
  CacheType,
  Client,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { redColor } from "../../utils/colors";

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
          opt.setName("termo").setDescription("Nome ou palavra-chave da música").setRequired(true)
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

  execute: async ({ interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return;

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Comando de música temporariamente desabilitado.")
      .setDescription("O suporte ao YouTube foi removido temporariamente para reduzir o uso de memória.")
      .setColor(redColor);
    return await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
