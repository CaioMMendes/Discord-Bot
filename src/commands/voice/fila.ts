import {
  CacheType,
  Client,
  EmbedBuilder,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { redColor, zincColor } from "../../utils/colors";

type ExecuteType = {
  client: Client<boolean>;
  interaction: Interaction<CacheType>;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fila")
    .setDescription("Mostra as músicas na fila."),

  execute: async ({ client, interaction }: ExecuteType) => {
    if (!interaction.isChatInputCommand()) return;

    const embed = new EmbedBuilder();
    const queue = client.player.nodes.get(interaction.guildId!);

    if (!queue || !queue.isPlaying()) {
      embed.setTitle("❌ Não há nenhuma música tocando.").setColor(redColor);
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const currentTrack = queue.currentTrack!;
    const tracks = queue.tracks.toArray().slice(0, 10);

    const proximas =
      tracks.length > 0
        ? tracks
            .map((t, i) => `**${i + 1}.** [${t.title}](${t.url}) — \`${t.duration}\``)
            .join("\n")
        : "*Nenhuma música na fila.*";

    embed
      .setTitle("🎵 Fila de músicas")
      .setDescription(
        `**Tocando agora:**\n[${currentTrack.title}](${currentTrack.url}) — \`${currentTrack.duration}\`\n\n**Próximas:**\n${proximas}`
      )
      .setThumbnail(currentTrack.thumbnail)
      .setFooter({ text: `${queue.tracks.size} música(s) restante(s) na fila` })
      .setColor(zincColor);

    return await interaction.reply({ embeds: [embed] });
  },
};
