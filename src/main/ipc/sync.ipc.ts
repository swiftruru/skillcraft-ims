import { ipcMain } from 'electron'
import { getDb } from '../db'
import { SyncService } from '../services/sync.service'

export function registerSyncIpc(): void {
  ipcMain.handle('sync:trigger', async (_e, direction: 'push' | 'pull' | 'bidirectional' = 'bidirectional') => {
    try {
      const result = await SyncService.getInstance().sync(direction)
      return { success: true, ...result }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('sync:status', () => {
    const db = getDb()
    const lastSync = db
      .prepare('SELECT * FROM sync_log ORDER BY synced_at DESC LIMIT 1')
      .get()
    const recentLogs = db
      .prepare('SELECT * FROM sync_log ORDER BY synced_at DESC LIMIT 20')
      .all()
    return { lastSync, recentLogs }
  })

  ipcMain.handle('sync:testConnection', async () => {
    try {
      await SyncService.getInstance().testConnection()
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('sync:initSheetStructure', async () => {
    try {
      await SyncService.getInstance().initSheetStructure()
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
