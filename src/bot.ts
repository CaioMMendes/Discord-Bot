import { Client, IntentsBitField } from "discord.js"
import dotenv from "dotenv"
import { Player } from "discord-player"
import { getVoiceConnection } from "discord-voip"
import { config } from "./config"
import { interactions } from "./interactions/interactions"
import { refreshCommands } from "./utils/refresh-commands"
import { AttachmentExtractor } from "@discord-player/extractor"
import { syncPanels } from "./utils/sound-panel"
import { handleUpload } from "./utils/handle-upload"

dotenv.config()
const { token } = config()

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildIntegrations,
    IntentsBitField.Flags.GuildEmojisAndStickers,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
  ],
})

client.player = new Player(client)

client.player.events.on("error", (queue, error) => {
  console.error(`[player] Erro na fila de ${queue.guild.name}:`, error)
})

client.player.events.on("playerError", (queue, error) => {
  console.error(`[player] Erro ao tocar em ${queue.guild.name}:`, error)
})

client.player.events.on("audioTrackAdd", (_queue, track) => {
  console.log(`[player] Track adicionada: ${track.title}`)
})

client.player.events.on("playerStart", (_queue, track) => {
  console.log(`[player] Tocando agora: ${track.title}`)
})

client.once("clientReady", async (e) => {
  console.log(`\n😁 ${e.user.tag} está online!\n`)
  await client.player.extractors.register(AttachmentExtractor, {})
  await refreshCommands({ client })

  try {
    await syncPanels(client)
    console.log("[sound-panel] Painéis de sons sincronizados.")
  } catch (err) {
    console.error("[sound-panel] Falha ao sincronizar painéis no startup:", err)
  }
})

client.on("interactionCreate", (interaction) => {
  interactions({ interaction, client })
})

const idleTimers = new Map<string, NodeJS.Timeout>()
const IDLE_TIMEOUT_MS = 30 * 60 * 1000

client.on("voiceStateUpdate", (_old, newState) => {
  if (!newState.guild) return
  if (client.player.nodes.get(newState.guild.id)) return

  const guildId = newState.guild.id
  const connection = getVoiceConnection(guildId)
  if (!connection) return

  const channelId = connection.joinConfig.channelId
  if (!channelId) return

  const channel = newState.guild.channels.cache.get(channelId)
  if (!channel?.isVoiceBased()) return

  const isEmpty = channel.members.filter((m) => !m.user.bot).size === 0

  if (isEmpty) {
    if (!idleTimers.has(guildId)) {
      const timer = setTimeout(() => {
        getVoiceConnection(guildId)?.destroy()
        idleTimers.delete(guildId)
      }, IDLE_TIMEOUT_MS)
      idleTimers.set(guildId, timer)
    }
  } else {
    const existing = idleTimers.get(guildId)
    if (existing) {
      clearTimeout(existing)
      idleTimers.delete(guildId)
    }
  }
})

const palavrasChave = [
  "banheiro",
  "corno",
  "cabeçuda",
  "tiltado",
  "bocó",
  "racionais",
]

function identificarPalavrasChave(texto: string): string[] {
  const palavras = texto.toLowerCase().split(" ")
  return palavras.filter((palavra) => palavrasChave.includes(palavra))
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return

  // Upload de sons para o Drive (canais configurados em pituimSounds)
  try {
    await handleUpload(message, client)
  } catch (err) {
    console.error("[upload] Erro:", err)
  }

  const canalMusica = process.env.canalMusica
  if (!canalMusica || message.channel.id !== canalMusica) return

  try {
    const encontradas = identificarPalavrasChave(message.content)

    if (encontradas.includes("banheiro")) {
      message.react("💩")
      message.reply(`${message.author.username} cagão 💩`)
    }
  } catch (err) {
    console.error(err)
  }
})

client.login(token)
