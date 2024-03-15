import { REST, Routes } from "discord.js";
import { config } from "../config";
import { commandsList } from "./commands-list";

export const refreshCommands = async () => {
  const { token, clientId } = config();

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(clientId), {
      body: commandsList,
    });

    console.log("Successfully reloaded application (/) commands.");
    commandsList.map((command) =>
      console.log(`${command.name}:${command.description}`)
    );
  } catch (error) {
    console.error(error);
  }
};
