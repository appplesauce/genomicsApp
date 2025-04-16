import express from 'express'
import multer from 'multer'
import dotenv from 'dotenv'
import cors from 'cors'
import { v4 as uuid } from 'uuid'
import fs from 'fs'
import { sendVCFEmail } from './emailService.js'
import { memoryStore } from './inboxPoller.js'

dotenv.config()
const app = express()
const upload = multer({ dest: 'uploads/' })

app.use(cors())
app.use(express.json())

app.post('/upload', upload.single('vcf'), async (req, res) => {
  const userId = uuid()
  const filePath = req.file.path
  try {
    await sendVCFEmail(filePath, userId)
    console.log(`📤 Sent email with user ID ${userId}`)
  } catch (err) {
    console.error('❌ Failed to send email:', err)
  }  
  res.json({ userId })
})

app.get('/result/:id', (req, res) => {
  const txt = memoryStore.get(req.params.id)
  if (!txt) return res.status(404).json({ status: 'waiting' })
  res.json({ status: 'done', data: txt })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`)
})
