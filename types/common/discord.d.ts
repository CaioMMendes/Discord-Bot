import { Collection } from "discord.js";

type PlayerType = {
  play(
    channel: GuildVoiceChannelResolvable,
    query: TrackLike,
    options: PlayerNodeInitializerOptions<T>
  );
} & PlayerEventsEmitter<PlayerEvents>;

declare module "discord.js" {
  export interface Client {
    commands: Collection<unknown, any>;
    player: PlayerType;
  }
}
