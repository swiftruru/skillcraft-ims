import cron from 'node-cron'
import { getDb } from '../db'
import { SyncService } from './sync.service'

export class SchedulerService {
  private static instance: SchedulerService
  private task: cron.ScheduledTask | null = null

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService()
    }
    return SchedulerService.instance
  }

  start(): void {
    const db = getDb()
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

  stop(): void {
    if (this.task) {
      this.task.stop()
      this.task = null
    }
  }

  restart(): void {
    this.stop()
    this.start()
  }
}
