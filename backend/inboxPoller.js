import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import dotenv from 'dotenv'

dotenv.config()

export const memoryStore = new Map()

const client = new ImapFlow({
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const startIMAPPoller = async () => {
  await client.connect()

  setInterval(async () => {
    await client.mailboxOpen('INBOX')
    const messages = await client.search({ unseen: true })

    for await (const msg of client.fetch(messages, { source: true })) {
      const parsed = await simpleParser(msg.source)
      const match = parsed.subject?.match(/\[VCF_UPLOAD:(.+?)\]/)
      const attachment = parsed.attachments?.find(a => a.filename.endsWith('.txt'))

      if (match && attachment) {
        const userId = match[1]
        const content = attachment.content.toString()
        memoryStore.set(userId, content)
        console.log(`📥 Stored result for ${userId}`)
      }
    }
  }, 10000)
}

startIMAPPoller()
