import { Client, Collection, REST, Routes } from "discord.js";
import { config } from "../config";
import path from "node:path";

const glob = require("glob");

export type RefreshCommandsType = {
  client: Client<boolean>;
};

export const refreshCommands = async ({ client }: RefreshCommandsType) => {
  const { token, clientId } = config();
  const commands: any[] = [];
  client.commands = new Collection();

  try {
    const commandsPath = path.normalize(path.join(__dirname, "..", "commands"));
    const pattern = commandsPath.replace(/\\/g, "/") + "/**/*.{js,ts}";
    const commandFiles: string[] = glob.sync(pattern);

    for (const file of commandFiles) {
      const command = require(file);
      if (command?.data?.name) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(`  /${command.data.name}`);
      }
    }
  } catch (error) {
    console.error("Erro ao carregar comandos:", error);
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const guildIds = client.guilds.cache.map((guild) => guild.id);

  console.log(`\nRegistrando ${commands.length} comandos em ${guildIds.length} servidor(es)...`);

  for (const guildId of guildIds) {
    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
    } catch (error) {
      console.error(`Erro ao registrar comandos no servidor ${guildId}:`, error);
    }
  }

  console.log("Comandos registrados com sucesso!\n");
};
