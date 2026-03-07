import { ipcMain, app, shell } from 'electron'
import { getDb } from '../db'
import { join } from 'path'

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', () => {
    const db = getDb()
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as {
      key: string
      value: string
    }[]
    const settings: Record<string, string> = {}
    for (const row of rows) {
      settings[row.key] = row.value
    }
    return {
      googleSheetId: settings['googleSheetId'] ?? '',
      serviceAccountKeyPath: settings['serviceAccountKeyPath'] ?? '',
      syncIntervalMinutes: parseInt(settings['syncIntervalMinutes'] ?? '30'),
      autoSyncEnabled: settings['autoSyncEnabled'] === 'true',
      dbPath: join(app.getPath('userData'), 'ims.db')
    }
  })

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    const db = getDb()
    db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value)
    return true
  })

  ipcMain.handle('settings:setAll', (_e, data: Record<string, string>) => {
    const db = getDb()
    const upsert = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)')
    db.transaction(() => {
      for (const [key, value] of Object.entries(data)) {
        upsert.run(key, String(value))
      }
    })()
    return true
  })

  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    shell.openExternal(url)
  })
}
