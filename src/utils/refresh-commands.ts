import { Client, Collection, REST, Routes } from "discord.js";
import { config } from "../config";
import { commandsList } from "./commands-list";
import path from "node:path";
import fs from "node:fs";
const glob = require("glob");
const fg = require("fast-glob");

export type RefreshCommandsType = {
  client: Client<boolean>;
};

export const refreshCommands = async ({ client }: RefreshCommandsType) => {
  const { token, clientId } = config();
  const commands = [];
  client.commands = new Collection();
  try {
    const commandsPath = path.normalize(path.join(__dirname, "..", "commands"));
    const commandFiles = glob.sync(`${commandsPath}/**/*.ts`);
    // console.log(commandFiles);

    for (const file of commandFiles) {
      // console.log(file.split("commands")[1]);
      // console.log(commandsPath, );
      const filePath = path.join(commandsPath, file.split("commands")[1]);
      // console.log(filePath);
      const command = require(filePath);

      if (command?.data?.name) {
        client.commands.set(command?.data?.name, command);
        commands.push(command.data);
      }
    }
  } catch (error) {
    console.log(error);
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const guildsIds = client.guilds.cache.map((guild) => guild.id);
  console.log("Started refreshing application (/) commands.");

  for (const guildId of guildsIds) {
    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
        // body: commandsList,
      });
    } catch (error) {
      console.error(error);
    }
  }
  commandsList.map((command) =>
    console.log(`${command.name}:${command.description}`)
  );
  console.log("Successfully reloaded application (/) commands.");
};
