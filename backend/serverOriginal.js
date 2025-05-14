import express from 'express'
import multer from 'multer'
import cors from 'cors'
import dotenv from 'dotenv'
import { v4 as uuid } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { uploadVCFToDrive } from './driveService.js'
import { memoryStore, startDrivePolling } from './drivePoller.js'

dotenv.config()

const app = express()
const upload = multer({ dest: 'uploads/' })
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// POST /upload - Upload VCF and send to Google Drive
app.post('/upload', upload.single('vcf'), async (req, res) => {
  const userId = uuid()
  const filePath = req.file?.path

  if (!filePath) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  try {
    await uploadVCFToDrive(filePath, userId)
    memoryStore.set(userId, { status: 'waiting' })
    res.json({ userId })
  } catch (err) {
    console.error('❌ Upload failed:', err)
    res.status(500).json({ error: 'Drive upload failed' })
  }
})

// GET /result/:id - Polling endpoint for processed results
app.get('/result/:id', (req, res) => {
  const entry = memoryStore.get(req.params.id)
  if (!entry) return res.status(404).json({ status: 'not_found' })
  if (entry.status === 'waiting') return res.status(202).json({ status: 'waiting' })

  console.log('✅ Sending result to client:', entry.data.slice(0, 200))
  res.json({ status: 'done', data: entry.data })
})

// Fallback for React Router (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`)
  startDrivePolling()
})
