import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import initSchemaSql from './migrations/001_init_schema.sql?raw'
import seedDataSql from './migrations/002_seed_data.sql?raw'
import inventoryAdjustmentsSql from './migrations/003_inventory_adjustments.sql?raw'
import demoSalesWaveSql from './migrations/004_demo_sales_wave.sql?raw'
import moreCustomersSql from './migrations/005_more_customers.sql?raw'

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

  console.log(`[DB] Initialized at: ${dbPath}`)
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
    { name: '005_more_customers', sql: moreCustomersSql }
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
