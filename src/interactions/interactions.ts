import { CacheType, Client, EmbedBuilder, Interaction } from "discord.js";
import { redColor } from "../utils/colors";

type InteractionsType = {
  interaction: Interaction<CacheType>;
  client: Client<boolean>;
};

export const interactions = async ({ interaction, client }: InteractionsType) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute({ client, interaction });
  } catch (error) {
    console.error(error);
    const embed = new EmbedBuilder()
      .setTitle("❌ Ocorreu um erro ao executar este comando.")
      .setColor(redColor);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed] });
    }
  }
};
