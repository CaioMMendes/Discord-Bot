import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} from "discord-voip";
import {
  CacheType,
  ChannelType,
  Client,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
  VoiceChannel,
} from "discord.js";
import { greenColor, redColor } from "../../utils/colors";

type ExecuteType = {
  client: Client<boolean>;
  interaction: Interaction<CacheType>;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sala")
    .setDescription("Entra em um canal de voz específico.")
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal de voz onde o bot deve entrar")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice)
    ),

  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return;

    const voiceChannel = interaction.options.getChannel("canal", true) as VoiceChannel;
    const embed = new EmbedBuilder();

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guildId!,
        adapterCreator: interaction.guild!.voiceAdapterCreator,
        selfDeaf: true,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 10_000);

      embed
        .setTitle(`✅ Entrei em **${voiceChannel.name}**!`)
        .setColor(greenColor);

      return await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      embed.setTitle("❌ Não foi possível entrar no canal de voz.").setColor(redColor);
      return await interaction.reply({ embeds: [embed] });
    }
  },
};
