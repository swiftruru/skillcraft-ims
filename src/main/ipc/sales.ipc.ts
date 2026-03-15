import { ipcMain, Notification } from 'electron'
import { SaleModel } from '../db/models/sale.model'
import { getDb } from '../db'
import { insertNotification } from './notifications.ipc'

function notifyLowStockAfterSale(soldProductIds: number[]): void {
  if (!Notification.isSupported() || soldProductIds.length === 0) return
  try {
    const db = getDb()
    const placeholders = soldProductIds.map(() => '?').join(',')
    const nowLow = db
      .prepare(
        `SELECT name, stock_qty, reorder_pt FROM products
         WHERE id IN (${placeholders}) AND stock_qty <= reorder_pt`
      )
      .all(...soldProductIds) as { name: string; stock_qty: number; reorder_pt: number }[]

    if (nowLow.length === 0) return

    const outOfStock = nowLow.filter((p) => p.stock_qty === 0)
    const lines = nowLow.slice(0, 3).map((p) =>
      p.stock_qty === 0 ? `${p.name}（已售完）` : `${p.name}（剩 ${p.stock_qty}）`
    )
    const extra = nowLow.length > 3 ? `…等共 ${nowLow.length} 項` : ''

    const title =
      outOfStock.length > 0
        ? `⚠️ ${outOfStock.length} 項商品已售完`
        : `⚠️ ${nowLow.length} 項商品庫存低於補貨點`

    new Notification({
      title,
      body: lines.join('、') + extra,
      silent: false
    }).show()

    // 同步寫入應用內通知（最多 5 筆）
    nowLow.slice(0, 5).forEach((p) => {
      insertNotification(
        'low_stock',
        '⚠️ 庫存預警',
        `${p.name} 庫存剩 ${p.stock_qty}，低於補貨點 ${p.reorder_pt}`,
        '/products'
      )
    })
  } catch {
    // 靜默忽略通知錯誤
  }
}

export function registerSalesIpc(): void {
  ipcMain.handle('sales:getAll', (_e, filters) => SaleModel.findAll(filters))
  ipcMain.handle('sales:getById', (_e, id: number) => SaleModel.findById(id))
  ipcMain.handle('sales:create', (_e, data) => SaleModel.create(data))
  ipcMain.handle('sales:complete', (_e, id: number) => {
    try {
      // 取得售出的商品 ID，用於完成後檢查庫存
      const order = SaleModel.findById(id)
      const soldProductIds = (order?.items ?? []).map((i) => i.product_id)

      const result = SaleModel.complete(id)
      if (result) {
        notifyLowStockAfterSale(soldProductIds)
      }
      return { success: true, data: result }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
  ipcMain.handle('sales:cancel', (_e, id: number) => SaleModel.cancel(id))
  ipcMain.handle('sales:return', (_e, id: number) => {
    try {
      const result = SaleModel.return(id)
      return { success: true, data: result }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
  ipcMain.handle('sales:partialReturn', (_e, id: number, items: { itemId: number; returnQty: number }[]) => {
    try {
      const result = SaleModel.partialReturn(id, items)
      return { success: true, data: result }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
  ipcMain.handle('sales:delete', (_e, id: number) => SaleModel.delete(id))
  ipcMain.handle('sales:markPaid', (_e, id: number) => {
    const order = SaleModel.findById(id)
    if (!order || order.status !== 'completed') throw new Error('只有已完成的銷售單可標記付款')
    getDb().prepare(`UPDATE sales_orders SET payment_status='paid' WHERE id=?`).run(id)
    return SaleModel.findById(id)
  })
  ipcMain.handle('sales:setPaymentDue', (_e, id: number, dueDate: string) => {
    getDb().prepare(`UPDATE sales_orders SET payment_due_date=? WHERE id=?`).run(dueDate, id)
    return SaleModel.findById(id)
  })
  ipcMain.handle('sales:batchMarkPaid', (_e, ids: number[]) => {
    const db = getDb()
    let updated = 0
    for (const id of ids) {
      try {
        const order = SaleModel.findById(id)
        if (order && order.status === 'completed' && order.payment_status !== 'paid') {
          db.prepare(`UPDATE sales_orders SET payment_status='paid' WHERE id=?`).run(id)
          updated++
        }
      } catch { /* skip */ }
    }
    return { updated }
  })
}
