import { Client } from "discord.js";
import { commandsList } from "./commands-list";

type RegisterCommandsType = { client: Client<boolean> };

export const registerCommands = async ({ client }: RegisterCommandsType) => {
  if (client.application) {
    try {
      // for (const command of commandsList) {
      //   await client.application.commands.create(command);
      //   console.log(command);
      // }
    } catch (error) {
      console.log(error);
    }
  }
};
