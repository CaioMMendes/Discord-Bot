import { Collection } from "discord.js";
import { Player } from "discord-player";

declare module "discord.js" {
  interface Client {
    commands: Collection<string, any>;
    player: Player;
  }
}
