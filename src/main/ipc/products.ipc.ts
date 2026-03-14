import { getDb } from '../db'
import { ipcMain } from 'electron'
import { ProductModel } from '../db/models/product.model'

export function registerProductsIpc(): void {
  ipcMain.handle('products:getAll', (_e, filters) => {
    return ProductModel.findAll(filters)
  })

  ipcMain.handle('products:getById', (_e, id: number) => {
    return ProductModel.findById(id)
  })

  ipcMain.handle('products:create', (_e, data) => {
    return ProductModel.create(data)
  })

  ipcMain.handle('products:update', (_e, id: number, data) => {
    return ProductModel.update(id, data)
  })

  ipcMain.handle('products:delete', (_e, id: number) => {
    return ProductModel.delete(id)
  })

  ipcMain.handle('products:getCategories', () => {
    return ProductModel.getCategories()
  })

  ipcMain.handle('products:getLowStock', () => {
    return ProductModel.getLowStockItems()
  })

  ipcMain.handle('products:adjust', (_e, productId: number, delta: number, reason: string, note?: string) => {
    return ProductModel.adjust(productId, delta, reason, note)
  })

  ipcMain.handle('products:getAdjustmentHistory', (_e, productId: number) => {
    return ProductModel.getAdjustmentHistory(productId)
  })

  ipcMain.handle('products:getAllAdjustments', (_e, filters) => {
    return ProductModel.getAllAdjustments(filters)
  })

  ipcMain.handle('products:batchDelete', (_e, ids: number[]) => {
    return ProductModel.batchDelete(ids)
  })

  ipcMain.handle('products:getPriceHistory', (_e, productId: number) => {
    const db = getDb()
    return db
      .prepare(
        `SELECT po.order_date, po.order_no, pi.unit_price, pi.quantity
         FROM purchase_items pi
         JOIN purchase_orders po ON pi.purchase_order_id = po.id
         WHERE pi.product_id = ? AND po.status = 'received'
         ORDER BY po.order_date DESC
         LIMIT 20`
      )
      .all(productId)
  })

  ipcMain.handle('products:nextSku', (_e, category: string) => {
    const db = getDb()
    const prefixMap: Record<string, string> = {
      '電子產品': 'ELEC',
      '電腦周邊': 'PERI',
      '文具': 'STAT',
      '包裝材料': 'PKG',
    }
    const prefix = prefixMap[category] ?? 'MISC'
    const row = db
      .prepare(`SELECT COUNT(*) as cnt FROM products WHERE sku LIKE ?`)
      .get(`${prefix}-%`) as { cnt: number }
    const next = String(row.cnt + 1).padStart(4, '0')
    return `${prefix}-${next}`
  })

  ipcMain.handle('products:getImage', (_e, id: number) => {
    const db = getDb()
    const row = db.prepare('SELECT image_data FROM products WHERE id = ?').get(id) as { image_data: string | null } | undefined
    return row?.image_data ?? null
  })

  ipcMain.handle('products:setImage', (_e, id: number, base64: string | null) => {
    const db = getDb()
    db.prepare(`UPDATE products SET image_data = ?, updated_at = datetime('now') WHERE id = ?`).run(base64, id)
    return { success: true }
  })

  ipcMain.handle('products:batchUpdate', (_e, ids: number[], data: { category?: string }) => {
    const db = getDb()
    if (!ids.length) return { updated: 0 }
    const placeholders = ids.map(() => '?').join(', ')
    let updated = 0
    if (data.category !== undefined) {
      const result = db
        .prepare(`UPDATE products SET category = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`)
        .run(data.category, ...ids)
      updated = result.changes
    }
    return { updated }
  })

  ipcMain.handle(
    'products:batchUpdatePrice',
    (_e, ids: number[], mode: 'set' | 'increase' | 'decrease', target: 'sell_price' | 'buy_price' | 'both', amount: number, amountType: 'fixed' | 'percent') => {
      const db = getDb()
      if (!ids.length || amount <= 0) return { updated: 0 }
      const placeholders = ids.map(() => '?').join(', ')

      const buildExpr = (col: string) => {
        if (mode === 'set') return amountType === 'fixed' ? `${amount}` : `${col} * ${amount} / 100.0`
        const delta = amountType === 'fixed' ? `${amount}` : `${col} * ${amount} / 100.0`
        const sign = mode === 'increase' ? '+' : '-'
        return `MAX(0, ${col} ${sign} ${delta})`
      }

      const cols: ('sell_price' | 'buy_price')[] = target === 'both' ? ['sell_price', 'buy_price'] : [target]
      let totalUpdated = 0
      db.transaction(() => {
        for (const col of cols) {
          const expr = buildExpr(col)
          const result = db
            .prepare(`UPDATE products SET ${col} = ROUND(${expr}, 2), updated_at = datetime('now') WHERE id IN (${placeholders})`)
            .run(...ids)
          totalUpdated = result.changes
        }
      })()
      return { updated: totalUpdated }
    }
  )
}
