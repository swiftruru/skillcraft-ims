import { ipcMain } from 'electron'
import { getDb } from '../db'

interface StockTakeRow { id: number; status: string }
interface StockTakeItemRow {
  id: number
  product_id: number
  system_qty: number
  counted_qty: number | null
  current_stock: number
}

export function registerStocktakeIpc(): void {
  ipcMain.handle('stocktake:getAll', () => {
    const db = getDb()
    return db.prepare(`
      SELECT st.*,
        COUNT(sti.id) as item_count,
        SUM(CASE WHEN sti.counted_qty IS NOT NULL AND sti.counted_qty != sti.system_qty THEN 1 ELSE 0 END) as diff_count,
        SUM(CASE WHEN sti.counted_qty IS NULL THEN 1 ELSE 0 END) as uncounted
      FROM stock_takes st
      LEFT JOIN stock_take_items sti ON sti.stock_take_id = st.id
      GROUP BY st.id
      ORDER BY st.created_at DESC
    `).all()
  })

  ipcMain.handle('stocktake:getById', (_e, id: number) => {
    const db = getDb()
    const take = db.prepare('SELECT * FROM stock_takes WHERE id = ?').get(id)
    if (!take) return null
    const items = db.prepare(`
      SELECT sti.*, p.name as product_name, p.sku, p.unit, p.category
      FROM stock_take_items sti
      JOIN products p ON sti.product_id = p.id
      WHERE sti.stock_take_id = ?
      ORDER BY p.category, p.name
    `).all(id)
    return { ...take, items }
  })

  ipcMain.handle('stocktake:create', (_e, notes?: string) => {
    const db = getDb()
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const takeNo = `ST-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${String(now.getTime()).slice(-4)}`

    const run = db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO stock_takes (take_no, notes) VALUES (?, ?)'
      ).run(takeNo, notes ?? null)
      const takeId = result.lastInsertRowid as number

      const products = db.prepare('SELECT id, stock_qty FROM products').all() as { id: number; stock_qty: number }[]
      const insertItem = db.prepare(
        'INSERT INTO stock_take_items (stock_take_id, product_id, system_qty) VALUES (?, ?, ?)'
      )
      for (const p of products) {
        insertItem.run(takeId, p.id, p.stock_qty)
      }
      return takeId
    })

    const takeId = run()
    return db.prepare('SELECT * FROM stock_takes WHERE id = ?').get(takeId)
  })

  ipcMain.handle('stocktake:updateItem', (_e, itemId: number, countedQty: number | null) => {
    const db = getDb()
    db.prepare('UPDATE stock_take_items SET counted_qty = ? WHERE id = ?').run(countedQty, itemId)
    return true
  })

  ipcMain.handle('stocktake:complete', (_e, id: number) => {
    const db = getDb()
    const take = db.prepare('SELECT * FROM stock_takes WHERE id = ?').get(id) as StockTakeRow | undefined
    if (!take || take.status !== 'draft') throw new Error('只有草稿狀態的盤點單可以完成')

    const items = db.prepare(`
      SELECT sti.*, p.stock_qty as current_stock
      FROM stock_take_items sti
      JOIN products p ON sti.product_id = p.id
      WHERE sti.stock_take_id = ?
        AND sti.counted_qty IS NOT NULL
        AND sti.counted_qty != sti.system_qty
    `).all(id) as StockTakeItemRow[]

    const run = db.transaction(() => {
      const adjust = db.prepare(
        'INSERT INTO inventory_adjustments (product_id, delta, reason, note) VALUES (?, ?, ?, ?)'
      )
      const updateStock = db.prepare(
        'UPDATE products SET stock_qty = ?, updated_at = ? WHERE id = ?'
      )
      for (const item of items) {
        const delta = item.counted_qty! - item.system_qty
        const newQty = item.current_stock + delta
        if (newQty < 0) throw new Error(`調整後庫存為負值，商品 ID ${item.product_id}`)
        updateStock.run(newQty, new Date().toISOString(), item.product_id)
        adjust.run(item.product_id, delta, '盤點修正', `盤點單 #${id} 自動調整`)
      }
      db.prepare(
        "UPDATE stock_takes SET status = 'completed', completed_at = datetime('now') WHERE id = ?"
      ).run(id)
    })

    run()
    return { success: true, adjustments: items.length }
  })

  ipcMain.handle('stocktake:delete', (_e, id: number) => {
    const db = getDb()
    const take = db.prepare('SELECT status FROM stock_takes WHERE id = ?').get(id) as StockTakeRow | undefined
    if (!take || take.status !== 'draft') throw new Error('只有草稿狀態的盤點單可以刪除')
    db.prepare('DELETE FROM stock_takes WHERE id = ?').run(id)
    return true
  })
}
