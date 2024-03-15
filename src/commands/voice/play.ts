import { SlashCommandBuilder } from "discord.js";

//Não pode ter letra maiuscula no name

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays a song.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("search")
        .setDescription("Searches for a song.")
        .addStringOption((option) =>
          option
            .setName("searchterms")
            .setDescription("Searches keywords.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("playlist")
        .setDescription("Plays playlist from youtube.")
        .addStringOption((option) =>
          option.setName("url").setDescription("playlist url").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("song")
        .setDescription("Plays song from youtube.")
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("url of the song")
            .setRequired(true)
        )
    ),
  execute: async ({ client, interaction }) => {},
};
