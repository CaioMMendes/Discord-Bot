import { Client, Message, TextChannel } from "discord.js"
import { getSoundChannels } from "../config"
import { uploadSound } from "./drive"
import { syncPanels } from "./sound-panel"

const AUDIO_EXTENSIONS = [
  ".mp3",
  ".ogg",
  ".wav",
  ".m4a",
  ".webm",
  ".flac",
  ".aac",
  ".opus",
]

function isAudio(name: string, contentType?: string | null): boolean {
  if (contentType?.startsWith("audio/")) return true
  const lower = name.toLowerCase()
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/** Envia uma mensagem temporária que se apaga sozinha (mantém o canal limpo). */
async function sendTemp(channel: TextChannel, content: string, ms = 8000): Promise<void> {
  try {
    const msg = await channel.send(content)
    setTimeout(() => msg.delete().catch(() => {}), ms)
  } catch {
    /* sem permissão de enviar — ignora */
  }
}

/**
 * Processa mensagens dos canais de sons. O canal é "somente painel":
 * - audio + palavra "upload" → sobe pro Drive; ao dar certo, apaga a mensagem
 * - qualquer outra mensagem → é apagada para manter só o painel
 */
export async function handleUpload(message: Message, client: Client): Promise<void> {
  if (message.author.bot) return
  if (!getSoundChannels().includes(message.channel.id)) return

  const channel = message.channel as TextChannel
  const hasUploadWord = /\bupload\b/i.test(message.content)
  const audioAttachments = [...message.attachments.values()].filter((a) =>
    isAudio(a.name, a.contentType)
  )

  // Não é um upload válido → apaga a mensagem (canal é só o painel)
  if (!hasUploadWord || audioAttachments.length === 0) {
    if (hasUploadWord && message.attachments.size > 0) {
      await sendTemp(channel, "❌ Envie um arquivo de **áudio** (mp3, ogg, wav, m4a...).")
    }
    await message.delete().catch(() => {})
    return
  }

  await message.react("⏳").catch(() => {})

  const added: string[] = []
  const failed: string[] = []

  for (const attachment of audioAttachments) {
    try {
      const res = await fetch(attachment.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buffer = Buffer.from(await res.arrayBuffer())
      const saved = await uploadSound(attachment.name, attachment.contentType ?? "", buffer)
      added.push(saved.name)
    } catch (err: any) {
      console.error(`[upload] Falha em ${attachment.name}:`, err?.message ?? err)
      failed.push(attachment.name)
    }
  }

  if (added.length > 0) {
    try {
      await syncPanels(client)
    } catch (err) {
      console.error("[upload] Falha ao atualizar painéis:", err)
    }
    // Sucesso → apaga a mensagem de upload (canal volta a ter só o painel)
    await message.delete().catch(() => {})
    if (failed.length > 0) {
      await sendTemp(channel, `⚠️ Não consegui subir: ${failed.join(", ")}`)
    }
    return
  }

  // Falha total → mantém a mensagem do usuário e avisa
  if (client.user) {
    await message.reactions.cache.get("⏳")?.users.remove(client.user.id).catch(() => {})
  }
  await message.react("❌").catch(() => {})
  await sendTemp(channel, `❌ Não consegui subir: ${failed.join(", ")}`)
}
