import {
  Client,
  IntentsBitField,
  GatewayIntentBits,
  Collection,
  SlashCommandBuilder,
  CommandInteraction,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Retorna o ping da API do Discord."),

  async execute(interaction = new CommandInteraction()) {
    const ping = Date.now() - interaction.createdTimestamp;

    await interaction.reply(`Pong! 🏓 Seu ping é ${ping} ms.`);
  },
};
