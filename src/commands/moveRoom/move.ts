import {
  CacheType,
  ChannelType,
  Client,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { greenColor, redColor } from "../../utils/colors";

type ExecuteType = {
  client: Client<boolean>;
  interaction: Interaction<CacheType>;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mover")
    .setDescription("Move um usuário entre dois canais de voz repetidamente.")
    .addUserOption((option) =>
      option.setName("pessoa").setDescription("Usuário a ser movido").setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("canal1")
        .setDescription("Primeiro canal de voz")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice)
    )
    .addChannelOption((option) =>
      option
        .setName("canal2")
        .setDescription("Segundo canal de voz")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice)
    )
    .addIntegerOption((option) =>
      option
        .setName("intervalo")
        .setDescription("Intervalo entre movimentações em ms (padrão: 400)")
        .setRequired(false)
        .setMinValue(200)
        .setMaxValue(5000)
    )
    .addIntegerOption((option) =>
      option
        .setName("duracao")
        .setDescription("Duração total em ms (padrão: 5000)")
        .setRequired(false)
        .setMinValue(1000)
        .setMaxValue(30000)
    ),

  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return;

    const embed = new EmbedBuilder();
    const user = interaction.options.getUser("pessoa", true);
    const canal1 = interaction.options.getChannel("canal1", true);
    const canal2 = interaction.options.getChannel("canal2", true);
    const interval = interaction.options.getInteger("intervalo") ?? 400;
    const duration = interaction.options.getInteger("duracao") ?? 5000;

    try {
      const member = await interaction.guild!.members.fetch(user.id);

      if (!member.voice.channel) {
        embed
          .setTitle("❌ O usuário precisa estar em um canal de voz!")
          .setColor(redColor);
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const originalChannel = member.voice.channel;
      let isFirstChannel = true;
      let count = 0;

      embed
        .setTitle("🌀 Bullying iniciado!")
        .setDescription(
          `Movendo **${user.username}** entre canais por ${duration / 1000}s.`
        )
        .setColor(greenColor);

      await interaction.reply({ embeds: [embed] });

      const moveInterval = setInterval(async () => {
        try {
          const targetChannel = isFirstChannel ? canal1 : canal2;
          await member.voice.setChannel(targetChannel.id);
          isFirstChannel = !isFirstChannel;
          count++;
        } catch {
          clearInterval(moveInterval);
        }
      }, interval);

      setTimeout(async () => {
        clearInterval(moveInterval);

        try {
          await member.voice.setChannel(originalChannel);
        } catch {
          // Canal original pode não estar mais disponível
        }

        const embedFim = new EmbedBuilder()
          .setTitle("✅ Bullying concluído!")
          .setDescription(`**${user.username}** foi movido **${count}x**.`)
          .setColor(greenColor);

        await interaction.editReply({ embeds: [embedFim] });
      }, duration);
    } catch (error) {
      console.error(error);
      embed
        .setTitle("❌ Ocorreu um erro ao executar o comando.")
        .setColor(redColor);
      if (interaction.replied) {
        return await interaction.editReply({ embeds: [embed] });
      }
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
