import { CacheType, Interaction } from "discord.js";

type IteractionsType = {
  interaction: Interaction<CacheType>;
};

export const interactions = async ({ interaction }: IteractionsType) => {
  if (!interaction.isCommand()) return;
  const { commandName, options } = interaction;

  if (commandName === "pituim-oi") {
    // Respondendo ao comando
    return interaction.reply("Oi!");
  }
  if (commandName === "join") {
    if (commandName === "join") {
      // Verifica se o usuário selecionou uma sala de voz
      const voiceChannelOption = options.get("channel");
      if (!voiceChannelOption || !voiceChannelOption.isVoiceChannel()) {
        return interaction.reply({
          content: "Por favor, selecione uma sala de voz para eu entrar.",
          ephemeral: true, // Mensagem visível apenas para o autor da interação
        });
      }

      const voiceChannel = voiceChannelOption.channel;

      // Conecta o bot à sala de voz selecionada pelo usuário
      const connection = await voiceChannel.join();
      await interaction.reply("Estou conectado à sala de voz selecionada!");
    }
  }
};
