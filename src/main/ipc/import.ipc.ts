import { ipcMain, dialog, app } from 'electron'
import { readFileSync, copyFileSync } from 'fs'
import { join } from 'path'
import { getDb } from '../db'

type ImportResult = {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  error?: string
}

// Column name aliases -> canonical field
const FIELD_MAP: Record<string, string> = {
  sku: 'sku', SKU: 'sku', 品號: 'sku', 料號: 'sku',
  name: 'name', Name: 'name', 商品名稱: 'name', 品名: 'name',
  category: 'category', Category: 'category', 類別: 'category',
  sell_price: 'sell_price', 售價: 'sell_price', '銷售價': 'sell_price', 'Sell Price': 'sell_price',
  buy_price: 'buy_price', 進價: 'buy_price', 成本: 'buy_price', 'Buy Price': 'buy_price',
  stock_qty: 'stock_qty', 庫存: 'stock_qty', Stock: 'stock_qty', 數量: 'stock_qty',
  reorder_pt: 'reorder_pt', 補貨點: 'reorder_pt', Reorder: 'reorder_pt', 安全庫存: 'reorder_pt',
  unit: 'unit', Unit: 'unit', 單位: 'unit',
  description: 'description', 說明: 'description', 備註: 'description', Description: 'description'
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export function registerImportIpc(): void {
  ipcMain.handle('import:csv', async (): Promise<ImportResult> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '選擇 CSV 檔案',
      filters: [{ name: 'CSV 檔案', extensions: ['csv'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths[0]) return { success: false, imported: 0, skipped: 0, errors: [] }

    try {
      // Read file with BOM handling
      let content = readFileSync(filePaths[0], 'utf-8')
      if (content.charCodeAt(0) === 0xfeff) content = content.slice(1) // strip BOM

      const lines = content.split(/\r?\n/).filter((l) => l.trim())
      if (lines.length < 2) return { success: false, imported: 0, skipped: 0, errors: ['CSV 至少需要標題列與一筆資料'] }

      // Parse headers
      const rawHeaders = parseCsvLine(lines[0])
      const headers = rawHeaders.map((h) => FIELD_MAP[h] ?? null)

      const skuIdx = headers.indexOf('sku')
      const nameIdx = headers.indexOf('name')
      if (skuIdx === -1 || nameIdx === -1) {
        return {
          success: false, imported: 0, skipped: 0,
          errors: ['找不到必填欄位：SKU（品號）和商品名稱（品名）'],
          error: '缺少必填欄位'
        }
      }

      const dataLines = lines.slice(1)
      const db = getDb()

      // Auto-backup if more than 50 rows
      if (dataLines.length > 50) {
        const dbPath = join(app.getPath('userData'), 'ims.db')
        const backupPath = join(app.getPath('userData'), `ims.db.backup.${Date.now()}`)
        copyFileSync(dbPath, backupPath)
      }

      const upsert = db.prepare(`
        INSERT INTO products (sku, name, category, sell_price, buy_price, stock_qty, reorder_pt, unit, description)
        VALUES (@sku, @name, @category, @sell_price, @buy_price, @stock_qty, @reorder_pt, @unit, @description)
        ON CONFLICT(sku) DO UPDATE SET
          name       = excluded.name,
          category   = excluded.category,
          sell_price = excluded.sell_price,
          buy_price  = excluded.buy_price,
          stock_qty  = excluded.stock_qty,
          reorder_pt = excluded.reorder_pt,
          unit       = excluded.unit,
          description = excluded.description,
          updated_at = datetime('now')
      `)

      let imported = 0
      const errors: string[] = []

      const runAll = db.transaction(() => {
        dataLines.forEach((line, idx) => {
          if (!line.trim()) return
          const row = parseCsvLine(line)
          const sku = row[skuIdx]?.trim()
          const name = row[nameIdx]?.trim()
          if (!sku || !name) {
            errors.push(`第 ${idx + 2} 列：SKU 或名稱為空，已跳過`)
            return
          }
          const record = {
            sku,
            name,
            category: null as string | null,
            sell_price: 0,
            buy_price: 0,
            stock_qty: 0,
            reorder_pt: 0,
            unit: '個',
            description: null as string | null
          }
          headers.forEach((field, i) => {
            if (!field || i === skuIdx || i === nameIdx) return
            const val = row[i]?.trim() ?? ''
            if (field === 'category') record.category = val || null
            else if (field === 'sell_price') record.sell_price = parseFloat(val) || 0
            else if (field === 'buy_price') record.buy_price = parseFloat(val) || 0
            else if (field === 'stock_qty') record.stock_qty = parseInt(val) || 0
            else if (field === 'reorder_pt') record.reorder_pt = parseInt(val) || 0
            else if (field === 'unit') record.unit = val || '個'
            else if (field === 'description') record.description = val || null
          })
          upsert.run(record)
          imported++
        })
      })

      runAll()
      return { success: true, imported, skipped: errors.length, errors }
    } catch (err) {
      throw err
    }
  })
}
