import {
  CacheType,
  Client,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { greenColor } from "../../utils/colors";

type ExecuteType = {
  client: Client<boolean>;
  interaction: Interaction<CacheType>;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("oi")
    .setDescription("Receba um oi do Pituim!"),

  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return;

    const embed = new EmbedBuilder()
      .setTitle(`👋 Oi, ${interaction.user.displayName}!`)
      .setDescription("Olá! Seja bem-vindo(a)! 🎉")
      .setColor(greenColor);

    return await interaction.reply({ embeds: [embed] });
  },
};
