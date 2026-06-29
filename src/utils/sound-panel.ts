import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Message,
  TextChannel,
} from "discord.js"
import { getSoundChannels } from "../config"
import { DriveSound, listSounds } from "./drive"
import { getPrivateMap, prunePrivateMap } from "./private-sounds"
import { zincColor } from "./colors"

// Marcador usado pra reconhecer as mensagens-painel do bot (no rodapé do embed)
const PANEL_MARKER = "PITUIM_SOUNDS_PANEL"
export const SOUND_BUTTON_PREFIX = "sound:"

const BUTTONS_PER_ROW = 5
const ROWS_PER_MESSAGE = 5
const BUTTONS_PER_PAGE = BUTTONS_PER_ROW * ROWS_PER_MESSAGE // 25

/** Nome do botão = nome do arquivo sem extensão (limitado a 80 chars). */
export function soundLabel(fileName: string): string {
  const noExt = fileName.replace(/\.[^./\\]+$/, "").trim()
  return (noExt || "som").slice(0, 80)
}

/** Quebra um array em pedaços de tamanho fixo. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

interface PanelPage {
  embeds: EmbedBuilder[]
  components: ActionRowBuilder<ButtonBuilder>[]
}

/** Monta as páginas do painel (cada página = 1 mensagem com até 25 botões). */
function buildPages(sounds: DriveSound[]): PanelPage[] {
  if (sounds.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("🔊 Sons do Pituim")
      .setDescription(
        "Nenhum som ainda.\nEnvie um arquivo de áudio com a palavra **upload** para adicionar (ou **upload-privado** para um som visível só neste servidor)."
      )
      .setColor(zincColor)
      .setFooter({ text: PANEL_MARKER })
    return [{ embeds: [embed], components: [] }]
  }

  const pages = chunk(sounds, BUTTONS_PER_PAGE)
  return pages.map((pageSounds, pageIndex) => {
    const rows = chunk(pageSounds, BUTTONS_PER_ROW).map((rowSounds) => {
      const row = new ActionRowBuilder<ButtonBuilder>()
      for (const sound of rowSounds) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`${SOUND_BUTTON_PREFIX}${sound.id}`)
            .setLabel(soundLabel(sound.name))
            .setStyle(ButtonStyle.Primary)
        )
      }
      return row
    })

    const title =
      pages.length > 1
        ? `🔊 Sons do Pituim — página ${pageIndex + 1}/${pages.length}`
        : "🔊 Sons do Pituim"

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(zincColor)
      .setFooter({ text: PANEL_MARKER })

    return { embeds: [embed], components: rows }
  })
}

/** Identifica se uma mensagem é um painel de sons criado pelo bot. */
function isPanelMessage(msg: Message, botId: string): boolean {
  return (
    msg.author.id === botId &&
    (msg.embeds[0]?.footer?.text?.startsWith(PANEL_MARKER) ?? false)
  )
}

/** Apaga uma lista de mensagens (bulk quando possível, individual para as antigas). */
export async function purgeMessages(channel: TextChannel, messages: Message[]): Promise<void> {
  if (messages.length === 0) return
  try {
    const deleted = await channel.bulkDelete(messages, true)
    const remaining = messages.filter((m) => !deleted.has(m.id))
    for (const m of remaining) await m.delete().catch(() => {})
  } catch {
    for (const m of messages) await m.delete().catch(() => {})
  }
}

/**
 * Garante que o canal contenha SOMENTE as mensagens-painel corretas:
 * cria/edita os painéis e apaga todo o resto (mensagens de usuários, sobras, etc).
 */
async function syncChannelPanel(
  channel: TextChannel,
  botId: string,
  sounds: DriveSound[]
): Promise<void> {
  const pages = buildPages(sounds)
  const fetched = await channel.messages.fetch({ limit: 100 })
  const all = [...fetched.values()]

  const panels = all
    .filter((m) => isPanelMessage(m, botId))
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
  const others = all.filter((m) => !isPanelMessage(m, botId))

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    if (panels[i]) {
      await panels[i].edit({ embeds: page.embeds, components: page.components })
    } else {
      await channel.send({ embeds: page.embeds, components: page.components })
    }
  }

  // Apaga painéis sobrando (quando o nº de páginas diminuiu) + qualquer outra mensagem
  const extraPanels = panels.slice(pages.length)
  await purgeMessages(channel, [...others, ...extraPanels])
}

/**
 * Sincroniza os painéis de TODOS os canais configurados com o conteúdo atual do Drive.
 * Use após upload, no /refresh e na inicialização do bot.
 */
export async function syncPanels(client: Client): Promise<void> {
  const botId = client.user?.id
  if (!botId) return

  const channelIds = getSoundChannels()
  if (channelIds.length === 0) {
    console.warn("[sound-panel] Nenhum canal configurado em pituimSounds")
    return
  }

  const sounds = await listSounds()

  // Reconcilia o JSON de sons privados com o que realmente existe no Drive:
  // arquivos deletados/inexistentes saem do mapa (fonte de verdade da privacidade).
  prunePrivateMap(new Set(sounds.map((s) => s.id)))
  const privateMap = getPrivateMap()

  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId)
      if (!channel || channel.type !== ChannelType.GuildText) {
        console.warn(`[sound-panel] Canal ${channelId} não é um canal de texto válido`)
        continue
      }
      const textChannel = channel as TextChannel
      // Públicos aparecem em todos os canais; privados só no servidor dono.
      const visible = sounds.filter(
        (s) => !privateMap[s.id] || privateMap[s.id] === textChannel.guildId
      )
      await syncChannelPanel(textChannel, botId, visible)
    } catch (err) {
      console.error(`[sound-panel] Erro ao sincronizar canal ${channelId}:`, err)
    }
  }
}
