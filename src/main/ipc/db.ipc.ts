import { ipcMain, app, dialog } from 'electron'
import { join } from 'path'
import { copyFileSync } from 'fs'
import { SchedulerService } from '../services/scheduler.service'

function getDbPath(): string {
  return join(app.getPath('userData'), 'skillcraft-ims.db')
}

export function registerDbIpc(): void {
  ipcMain.handle('db:backup', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: '備份資料庫',
      defaultPath: `skillcraft-ims-backup-${today}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })

    if (canceled || !filePath) {
      return { success: false, error: '已取消' }
    }

    try {
      copyFileSync(getDbPath(), filePath)
      return { success: true, filePath }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('db:restore', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: '還原資料庫',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) {
      return { success: false, error: '已取消' }
    }

    try {
      copyFileSync(filePaths[0], getDbPath())
      app.relaunch()
      app.exit(0)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
  ipcMain.handle('db:autoBackup', () => {
    return SchedulerService.getInstance().runAutoBackup()
  })
}
