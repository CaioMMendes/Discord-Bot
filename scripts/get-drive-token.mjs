// Script de uso único para obter o GOOGLE_REFRESH_TOKEN do Google Drive.
//
// Pré-requisitos:
//   1. npm install googleapis
//   2. Preencher GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env
//      (criados no Google Cloud Console — veja o guia que o Claude passou)
//
// Como rodar:
//   node scripts/get-drive-token.mjs
//
// Ele abre uma URL, você autoriza com sua conta Google, e o token aparece no terminal.
// Copie o refresh token impresso para o .env como GOOGLE_REFRESH_TOKEN.

import http from "http"
import { google } from "googleapis"
import dotenv from "dotenv"

dotenv.config()

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const PORT = 53682
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`

// Escopo completo do Drive: permite criar, listar e apagar arquivos.
// (use "https://www.googleapis.com/auth/drive.file" se quiser acesso só
//  aos arquivos criados pelo próprio bot)
const SCOPES = ["https://www.googleapis.com/auth/drive"]

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "\n❌ Faltam GOOGLE_CLIENT_ID e/ou GOOGLE_CLIENT_SECRET no .env.\n" +
      "   Preencha-os antes de rodar este script.\n"
  )
  process.exit(1)
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline", // necessário para receber refresh_token
  prompt: "consent", // força emitir refresh_token mesmo se já autorizou antes
  scope: SCOPES,
})

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth2callback")) {
    res.writeHead(404).end()
    return
  }

  const url = new URL(req.url, REDIRECT_URI)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error) {
    res.writeHead(400).end(`Erro na autorização: ${error}`)
    console.error(`\n❌ Autorização negada: ${error}\n`)
    server.close()
    process.exit(1)
  }

  if (!code) {
    res.writeHead(400).end("Sem código de autorização.")
    return
  }

  try {
    const { tokens } = await oauth2.getToken(code)
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(
      "<h2>✅ Pronto! Pode fechar esta aba e voltar ao terminal.</h2>"
    )

    console.log("\n========================================")
    if (tokens.refresh_token) {
      console.log("✅ Sucesso! Adicione esta linha ao seu .env:\n")
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
    } else {
      console.log(
        "⚠️  Nenhum refresh_token retornado. Isso acontece quando a conta\n" +
          "   já tinha autorizado antes. Revogue o acesso em\n" +
          "   https://myaccount.google.com/permissions e rode de novo."
      )
    }
    console.log("========================================\n")
  } catch (err) {
    console.error("\n❌ Falha ao trocar o código por token:", err.message, "\n")
  } finally {
    server.close()
    process.exit(0)
  }
})

server.listen(PORT, () => {
  console.log("\n🔗 Abra esta URL no navegador e autorize com sua conta Google:\n")
  console.log(authUrl)
  console.log(`\n(aguardando o retorno em ${REDIRECT_URI} ...)\n`)
})
