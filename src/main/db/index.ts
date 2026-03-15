import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import initSchemaSql from './migrations/001_init_schema.sql?raw'
import seedDataSql from './migrations/002_seed_data.sql?raw'
import inventoryAdjustmentsSql from './migrations/003_inventory_adjustments.sql?raw'
import demoSalesWaveSql from './migrations/004_demo_sales_wave.sql?raw'
import moreCustomersSql from './migrations/005_more_customers.sql?raw'
import stockTakesSql from './migrations/006_stock_takes.sql?raw'
import demoStockTakesSql from './migrations/007_demo_stock_takes.sql?raw'
import demoAdjustmentsSql from './migrations/008_demo_adjustments.sql?raw'
import appNotificationsSql from './migrations/009_app_notifications.sql?raw'
import fixReturnedStatusSql from './migrations/010_fix_returned_status.sql?raw'
import productImagesSql from './migrations/011_product_images.sql?raw'
import avcoCostSql from './migrations/012_avco_cost.sql?raw'
import paymentTermsSql from './migrations/013_payment_terms.sql?raw'
import partialReturnSql from './migrations/014_partial_return.sql?raw'
import creditLimitSql from './migrations/015_credit_limit.sql?raw'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  mkdirSync(userDataPath, { recursive: true })

  const dbPath = join(userDataPath, 'ims.db')
  db = new Database(dbPath)

  // Performance & concurrency settings
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('cache_size = -16000') // 16MB cache

  await runMigrations(db)

  // One-time migration: copy app_settings from the legacy 'skillcraft-ims' userData path
  // if the current DB has no settings yet (happens when app.name change shifted the path).
  migrateSettingsFromLegacyPath(db)

  console.log(`[DB] Initialized at: ${dbPath}`)
}

function migrateSettingsFromLegacyPath(database: Database.Database): void {
  const hasSettings = (database.prepare('SELECT COUNT(*) as n FROM app_settings').get() as { n: number }).n > 0
  if (hasSettings) return

  const legacyDbPath = join(app.getPath('appData'), 'skillcraft-ims', 'ims.db')
  if (!existsSync(legacyDbPath)) return

  try {
    const legacy = new Database(legacyDbPath, { readonly: true })
    const rows = legacy.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[]
    legacy.close()

    if (rows.length === 0) return

    const upsert = database.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)')
    database.transaction(() => { rows.forEach((r) => upsert.run(r.key, r.value)) })()
    console.log(`[DB] Migrated ${rows.length} settings from legacy path`)
  } catch (err) {
    console.warn('[DB] Legacy settings migration skipped:', err)
  }
}

async function runMigrations(database: Database.Database): Promise<void> {
  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      run_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const migrations = [
    { name: '001_init_schema', sql: initSchemaSql },
    { name: '002_seed_data', sql: seedDataSql },
    { name: '003_inventory_adjustments', sql: inventoryAdjustmentsSql },
    { name: '004_demo_sales_wave', sql: demoSalesWaveSql },
    { name: '005_more_customers', sql: moreCustomersSql },
    { name: '006_stock_takes', sql: stockTakesSql },
    { name: '007_demo_stock_takes', sql: demoStockTakesSql },
    { name: '008_demo_adjustments', sql: demoAdjustmentsSql },
    { name: '009_app_notifications', sql: appNotificationsSql },
    { name: '010_fix_returned_status', sql: fixReturnedStatusSql },
    { name: '011_product_images', sql: productImagesSql },
    { name: '012_avco_cost', sql: avcoCostSql },
    { name: '013_payment_terms', sql: paymentTermsSql },
    { name: '014_partial_return', sql: partialReturnSql },
    { name: '015_credit_limit', sql: creditLimitSql },
  ]

  for (const migration of migrations) {
    const already = database
      .prepare('SELECT id FROM _migrations WHERE name = ?')
      .get(migration.name)

    if (!already) {
      try {
        database.exec(migration.sql)
        database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name)
        console.log(`[DB] Migration applied: ${migration.name}`)
      } catch (err) {
        console.error(`[DB] Migration failed: ${migration.name}`, err)
        throw err
      }
    }
  }
}
