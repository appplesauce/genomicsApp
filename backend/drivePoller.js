import { findTxtFileContent } from './driveService.js'

export const memoryStore = new Map()

export const startDrivePolling = () => {
  setInterval(async () => {
    for (const [userId, entry] of memoryStore.entries()) {
      if (entry.status === 'waiting') {
        const txtContent = await findTxtFileContent(userId)
        if (txtContent) {
          memoryStore.set(userId, { status: 'done', data: txtContent })
        }
      }
    }
  }, 5000)
}
