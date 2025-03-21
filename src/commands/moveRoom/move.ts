import { QueryType, QueueRepeatMode } from "discord-player"
import {
  CacheType,
  Client,
  SlashCommandBuilder,
  Interaction,
  EmbedBuilder,
  ChannelType,
} from "discord.js"
import { greenColor, redColor } from "../../utils/colors"

type ExecuteType = {
  client: Client<boolean>
  interaction: Interaction<CacheType>
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bullying")
    .setDescription("Do something.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("move")
        .setDescription("Acordar alguém.")
        .addChannelOption((option) =>
          option
            .setName("voicechannel1")
            .setDescription("Primeiro canal de voz")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice)
        )
        .addChannelOption((option) =>
          option
            .setName("voicechannel2")
            .setDescription("Segundo canal de voz")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice)
        )
        .addUserOption((option) =>
          option
            .setName("pessoa")
            .setDescription("Pessoa que vai sofrer bullying")
            .setRequired(true)
        )
    ),

  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand())
      return await interaction.channel!.send("Não é um comando de chat.") //todo se der erro voltar para isCommand
    const memberInteraction = interaction?.member as any
    let embed = new EmbedBuilder()
    try {
      const voiceChannel1 = interaction.options.getChannel("voicechannel1")!
      const voiceChannel2 = interaction.options.getChannel("voicechannel2")!
      const user = interaction.options.getUser("pessoa")!

      // Verificar se o membro está em um canal de voz
      const member = await interaction.guild!.members.fetch(user.id)
      if (!member.voice.channel) {
        // embed
        //   .setTitle("⚠️ O usuário precisa estar em um canal de voz!")
        //   .setColor(redColor)
        // return await interaction.reply({ embeds: [embed] })
        return
      }

      // Responder que o bullying começou
      // embed
      //   .setTitle("🌀 Iniciando bullying...")
      //   .setDescription(`Movendo ${user.username} entre canais por 5 segundos!`)
      //   .setColor(greenColor)
      // await interaction.reply({ embeds: [embed] })

      let originalChannel = member.voice.channel
      let isFirstChannel = true
      let count = 0

      // Criar intervalo para mover entre canais
      const moveInterval = setInterval(async () => {
        try {
          const targetChannel = isFirstChannel ? voiceChannel1 : voiceChannel2
          await member.voice.setChannel(targetChannel.id)
          isFirstChannel = !isFirstChannel
          count++
        } catch (error) {
          clearInterval(moveInterval)
          console.log(error)
        }
      }, 400) // Move a cada 500ms

      // Parar após 5 segundos
      setTimeout(async () => {
        clearInterval(moveInterval)

        // Voltar para o canal original
        try {
          await member.voice.setChannel(originalChannel)
        } catch (error) {
          console.log("Não foi possível retornar ao canal original")
        }

        // Atualizar mensagem
        // embed
        //   .setTitle("✅ Bullying completo!")
        //   .setDescription(`Movimentos realizados: ${count}x`)
        //   .setColor(greenColor)
        // await interaction.editReply({ embeds: [embed] })
      }, 5000)
    } catch (error) {
      console.log(error)
      return
      // embed
      //   .setTitle("❌ Ocorreu um erro ao tentar executar este comando.")
      //   .setColor(redColor)
      // return await interaction.reply({ embeds: [embed] })
    }
  },
}
