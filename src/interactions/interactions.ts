import { CacheType, Client, Interaction } from "discord.js";

type IteractionsType = {
  interaction: Interaction<CacheType>;
  client: Client<boolean>;
};

export const interactions = async ({
  interaction,
  client,
}: IteractionsType) => {
  if (!interaction.isCommand()) return;
  const { commandName, options } = interaction;

  const command = client.commands.get(commandName);
  try {
    await command.execute({ client, interaction });
  } catch (error) {
    console.log(error);
    await interaction.reply("Ocorreu um erro ao tentar executar este comando.");
  }
  // if (commandName === "pituim-oi") {
  //   // Respondendo ao comando
  //   return interaction.reply("Oi!");
  // }
  // if (commandName === "join") {
  //   console.log("aaaaaaaaaaaaa");
  // }
};
