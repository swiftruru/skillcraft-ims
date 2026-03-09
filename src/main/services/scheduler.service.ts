import cron from 'node-cron'
import { Notification, app } from 'electron'
import { join } from 'path'
import { copyFileSync, readdirSync, statSync, unlinkSync, mkdirSync } from 'fs'
import { getDb } from '../db'
import { SyncService } from './sync.service'

export class SchedulerService {
  private static instance: SchedulerService
  private task: cron.ScheduledTask | null = null
  private dailyTask: cron.ScheduledTask | null = null
  private backupTask: cron.ScheduledTask | null = null

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService()
    }
    return SchedulerService.instance
  }

  start(): void {
    const db = getDb()

    // Daily 9:00 AM inventory summary notification (always active, regardless of autoSync setting)
    this.dailyTask = cron.schedule('0 9 * * *', () => {
      this.sendDailySummaryNotification()
    })
    console.log('[Scheduler] Daily summary notification scheduled at 09:00')

    // Daily 2:00 AM auto backup (if enabled)
    this.scheduleAutoBackup()

    const autoEnabled = db
      .prepare(`SELECT value FROM app_settings WHERE key = 'autoSyncEnabled'`)
      .get() as { value: string } | undefined

    if (autoEnabled?.value !== 'true') return

    const intervalRow = db
      .prepare(`SELECT value FROM app_settings WHERE key = 'syncIntervalMinutes'`)
      .get() as { value: string } | undefined

    const minutes = parseInt(intervalRow?.value ?? '30')
    const cronExpr = `*/${Math.max(1, minutes)} * * * *`

    this.task = cron.schedule(cronExpr, async () => {
      console.log('[Scheduler] Running auto sync...')
      try {
        await SyncService.getInstance().sync('bidirectional')
      } catch (err) {
        console.error('[Scheduler] Auto sync failed:', err)
      }
    })

    console.log(`[Scheduler] Auto sync scheduled every ${minutes} minutes`)
  }

  private sendDailySummaryNotification(): void {
    if (!Notification.isSupported()) return
    try {
      const db = getDb()
      const totalProducts = (
        db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number }
      ).cnt
      const lowStockCount = (
        db.prepare('SELECT COUNT(*) as cnt FROM products WHERE stock_qty <= reorder_pt').get() as { cnt: number }
      ).cnt
      const pendingSalesOrders = (
        db.prepare(`SELECT COUNT(*) as cnt FROM sales_orders WHERE status = 'pending'`).get() as { cnt: number }
      ).cnt
      const body = `共 ${totalProducts} 項商品，低庫存 ${lowStockCount} 項，待處理訂單 ${pendingSalesOrders} 筆`
      new Notification({ title: 'SkillCraft IMS — 每日庫存摘要', body, silent: false }).show()
    } catch {
      // Ignore notification errors silently
    }
  }

  scheduleAutoBackup(): void {
    if (this.backupTask) {
      this.backupTask.stop()
      this.backupTask = null
    }
    const db = getDb()
    const enabled = db
      .prepare(`SELECT value FROM app_settings WHERE key = 'autoBackupEnabled'`)
      .get() as { value: string } | undefined
    if (enabled?.value !== 'true') return

    this.backupTask = cron.schedule('0 2 * * *', () => {
      this.runAutoBackup()
    })
    console.log('[Scheduler] Auto backup scheduled at 02:00')
  }

  runAutoBackup(): { success: boolean; filePath?: string; error?: string } {
    try {
      const dbPath = join(app.getPath('userData'), 'skillcraft-ims.db')
      const backupDir = join(app.getPath('documents'), 'SkillCraft IMS Backups')
      mkdirSync(backupDir, { recursive: true })

      const today = new Date().toISOString().slice(0, 10)
      const filePath = join(backupDir, `ims-backup-${today}.db`)
      copyFileSync(dbPath, filePath)

      // Delete backups older than 30 days
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
      for (const file of readdirSync(backupDir)) {
        if (!file.startsWith('ims-backup-') || !file.endsWith('.db')) continue
        const full = join(backupDir, file)
        if (statSync(full).mtimeMs < cutoff) {
          try { unlinkSync(full) } catch { /* ignore */ }
        }
      }

      console.log('[Scheduler] Auto backup saved:', filePath)
      return { success: true, filePath }
    } catch (err) {
      console.error('[Scheduler] Auto backup failed:', err)
      return { success: false, error: String(err) }
    }
  }

  stop(): void {
    if (this.task) {
      this.task.stop()
      this.task = null
    }
    if (this.dailyTask) {
      this.dailyTask.stop()
      this.dailyTask = null
    }
    if (this.backupTask) {
      this.backupTask.stop()
      this.backupTask = null
    }
  }

  restart(): void {
    this.stop()
    this.start()
  }
}
