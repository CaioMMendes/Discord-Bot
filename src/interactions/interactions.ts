import { CacheType, Client, EmbedBuilder, Interaction } from "discord.js";
import { redColor } from "../utils/colors";
import { handleSoundButton } from "./sound-button";
import { SOUND_BUTTON_PREFIX } from "../utils/sound-panel";

type InteractionsType = {
  interaction: Interaction<CacheType>;
  client: Client<boolean>;
};

export const interactions = async ({ interaction, client }: InteractionsType) => {
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command?.autocomplete) return;
    try {
      await command.autocomplete({ client, interaction });
    } catch (error) {
      console.error("[autocomplete] Erro:", error);
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith(SOUND_BUTTON_PREFIX)) {
    try {
      await handleSoundButton({ client, interaction });
    } catch (error) {
      console.error("[sound-button] Erro:", error);
    }
    return;
  }

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
