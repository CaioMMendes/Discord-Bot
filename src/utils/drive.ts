import { Readable } from "node:stream"
import { google, drive_v3 } from "googleapis"

export interface DriveSound {
  id: string
  name: string
}

let cachedDrive: drive_v3.Drive | null = null

function getFolderId(): string {
  const folderId = process.env.GDRIVE_FOLDER_ID
  if (!folderId) throw new Error("GDRIVE_FOLDER_ID não configurado no .env")
  return folderId
}

/** Cria (ou reaproveita) o cliente autenticado do Google Drive. */
export function getDrive(): drive_v3.Drive {
  if (cachedDrive) return cachedDrive

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error(
      "Credenciais do Google Drive ausentes (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN)"
    )
  }

  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN })

  cachedDrive = google.drive({ version: "v3", auth })
  return cachedDrive
}

/** Lista todos os sons (arquivos não-lixeira) da pasta configurada. */
export async function listSounds(): Promise<DriveSound[]> {
  const drive = getDrive()
  const folderId = getFolderId()
  const sounds: DriveSound[] = []
  let pageToken: string | undefined

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name)",
      orderBy: "name",
      pageSize: 100,
      pageToken,
    })

    for (const file of res.data.files ?? []) {
      if (file.id && file.name) sounds.push({ id: file.id, name: file.name })
    }
    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  return sounds
}

/** Sobe um arquivo de áudio para a pasta de sons e retorna o registro criado. */
export async function uploadSound(
  name: string,
  mimeType: string,
  data: Buffer
): Promise<DriveSound> {
  const drive = getDrive()
  const folderId = getFolderId()

  const res = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType: mimeType || "application/octet-stream", body: Readable.from(data) },
    fields: "id, name",
  })

  if (!res.data.id || !res.data.name) {
    throw new Error("Upload concluído mas o Drive não retornou id/name")
  }
  return { id: res.data.id, name: res.data.name }
}

/** Retorna um stream legível com o conteúdo de áudio do arquivo. */
export async function getSoundStream(fileId: string): Promise<Readable> {
  const drive = getDrive()
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  )
  return res.data as unknown as Readable
}
