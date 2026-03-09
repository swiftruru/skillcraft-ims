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
}
