import { Client } from "discord.js";
import { commandsList } from "./commands-list";

type RegisterCommandsType = { client: Client<boolean> };

export const registerCommands = async ({ client }: RegisterCommandsType) => {
  if (client.application) {
    try {
      // await client.application.commands.create(commandsList);
    } catch (error) {
      console.log(error);
    }
  }
};
