# PituimBot

Bot de Discord para tocar música, disparar efeitos sonoros e um punhado de comandos de diversão. Feito em TypeScript com [discord.js](https://discord.js.org/) e [discord-player](https://discord-player.js.org/).

> 🔗 **Página do bot:** [pituim-bot.vercel.app](#)

## Recursos

- 🎵 **Música** — toca por busca, URL do YouTube ou playlist, com fila, skip, pause e resume. (Inativo)
- 🔊 **Efeitos sonoros** — toca sons do [myinstants.com](https://www.myinstants.com/) direto no canal de voz.
- 🎛️ **Painel de sons** — botões clicáveis para sons guardados no Google Drive, com upload pelo próprio chat (públicos ou privados por servidor).
- 🎮 **Diversão** — mover usuários entre canais, respostas a palavras-chave e outros extras.
- ⏱️ **Auto-saída** — o bot deixa o canal de voz após 30 minutos vazio.

## Comandos

| Comando | O que faz |
|---|---|
| `/play buscar [termo]` | Busca uma música pelo nome e toca. |
| `/play musica [url]` | Toca uma música pelo link do YouTube. |
| `/play playlist [url]` | Toca uma playlist do YouTube. |
| `/skip` | Pula a música atual. |
| `/pause` | Pausa a música. |
| `/resume` | Retoma a música pausada. |
| `/fila` | Mostra a fila de músicas. |
| `/sair` | Para a música e desconecta o bot. |
| `/sala [canal]` | Faz o bot entrar em um canal de voz específico. |
| `/som [nome]` | Toca um efeito sonoro do myinstants.com. |
| `/mover [canal1] [canal2]` | Move um usuário entre dois canais repetidamente. |
| `/oi` | Recebe um oi do Pituim. |
| `/refresh` | Re-sincroniza os botões de sons com os arquivos do Drive. |
| `/ajuda` | Lista todos os comandos disponíveis. |

## Como rodar

Requisitos: **Node.js 20+**.

```bash
npm install      # instala as dependências
npm run dev      # modo desenvolvimento com hot-reload
npm run build    # compila o TypeScript para dist/
npm start        # roda a versão compilada
```

## Configuração

Crie um arquivo `.env` na raiz (não é versionado):

```env
# Discord
TOKEN=              # token do bot
clientId=           # ID da aplicação
guildId=            # ID do servidor (registro dos comandos)

# Painel de sons
pituimSounds=       # ID(s) do canal do painel de sons (separados por vírgula)

# Google Drive (armazenamento dos sons)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GDRIVE_FOLDER_ID=   # pasta do Drive onde os sons ficam
```

O refresh token do Google é capturado uma única vez com:

```bash
node scripts/get-drive-token.mjs
```

## Painel de sons

Os sons ficam numa pasta do Google Drive e viram botões clicáveis num painel do canal configurado em `pituimSounds`.

- **Upload:** poste um áudio no canal com a palavra `upload` na mensagem para enviá-lo ao Drive.
- **Privado:** use `upload-privado` para que o som apareça só no servidor onde foi enviado.
- O painel se auto-organiza (25 botões por mensagem) e é sincronizado no startup, após uploads e no comando `/refresh`.

## Deploy

O projeto sobe na [Discloud](https://discloud.com/) via `discloud.config`. A plataforma roda `npm run build` seguido de `npm run start` automaticamente.

## Stack

- TypeScript + discord.js v14
- discord-player v7 (áudio via `opusscript` + `ffmpeg-static`)
- Google Drive API (`googleapis`) para os sons do painel
