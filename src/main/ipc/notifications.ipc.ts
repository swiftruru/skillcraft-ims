import { ipcMain } from 'electron'
import { getDb } from '../db'

export function registerNotificationsIpc(): void {
  ipcMain.handle('notifications:getAll', () => {
    const db = getDb()
    return db
      .prepare(
        `SELECT id, type, title, body, link, read, created_at
         FROM app_notifications
         ORDER BY created_at DESC
         LIMIT 50`
      )
      .all()
  })

  ipcMain.handle('notifications:markRead', (_e, id: number) => {
    const db = getDb()
    db.prepare('UPDATE app_notifications SET read = 1 WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('notifications:markAllRead', () => {
    const db = getDb()
    db.prepare('UPDATE app_notifications SET read = 1 WHERE read = 0').run()
    return true
  })
}

export function insertNotification(
  type: string,
  title: string,
  body: string,
  link?: string
): void {
  try {
    const db = getDb()
    db.prepare(
      `INSERT INTO app_notifications (type, title, body, link) VALUES (?, ?, ?, ?)`
    ).run(type, title, body, link ?? null)
  } catch {
    // Silent fail
  }
}
