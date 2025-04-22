import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

const SCOPES = ['https://www.googleapis.com/auth/drive']
const KEYFILE = path.join(process.cwd(), 'credentials.json')
const FOLDER_ID = process.env.DRIVE_FOLDER_ID

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILE,
  scopes: SCOPES,
})

const drive = google.drive({ version: 'v3', auth })

export const uploadVCFToDrive = async (filePath, userId) => {
  const fileMetadata = {
    name: `${userId}.vcf`,
    parents: [FOLDER_ID],
  }

  const media = {
    mimeType: 'text/plain',
    body: fs.createReadStream(filePath),
  }

  const file = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id',
  })

  console.log(`📤 Uploaded ${userId}.vcf to Drive as ID: ${file.data.id}`)
  return file.data.id
}

export const findTxtFileContent = async (userId) => {
  const expectedName = `${userId}.txt`
  const res = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and name='${expectedName}'`,
    fields: 'files(id, name)',
    spaces: 'drive',
  })

  if (res.data.files.length === 0) return null

  const fileId = res.data.files[0].id
  const dest = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })

  return new Promise((resolve, reject) => {
    let data = ''
    dest.data
      .on('data', chunk => (data += chunk))
      .on('end', () => {
        console.log(`📥 Found ${expectedName} and downloaded content`)
        resolve(data)
      })
      .on('error', reject)
  })
}
