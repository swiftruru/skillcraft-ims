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

function awardPoints(orderId: number, customerId: number, totalAmount: number): void {
  try {
    const db = getDb()
    const rateSetting = db.prepare(`SELECT value FROM settings WHERE key = 'points_rate'`).get() as { value: string } | undefined
    const rate = parseFloat(rateSetting?.value ?? '100')
    if (rate <= 0) return
    const points = Math.floor(totalAmount / rate)
    if (points <= 0) return
    db.prepare(`UPDATE customers SET points_balance = points_balance + ? WHERE id = ?`).run(points, customerId)
    db.prepare(`INSERT INTO customer_points_log (customer_id, type, amount, ref_order_id, note) VALUES (?, 'earned', ?, ?, ?)`).run(customerId, points, orderId, '訂單完成獲得')
    db.prepare(`UPDATE sales_orders SET points_earned = ? WHERE id = ?`).run(points, orderId)
  } catch { /* 靜默忽略點數錯誤，不影響主流程 */ }
}

function revokePoints(orderId: number, customerId: number): void {
  try {
    const db = getDb()
    const order = db.prepare(`SELECT points_earned FROM sales_orders WHERE id = ?`).get(orderId) as { points_earned: number } | undefined
    const earned = order?.points_earned ?? 0
    if (earned <= 0) return
    const customer = db.prepare(`SELECT points_balance FROM customers WHERE id = ?`).get(customerId) as { points_balance: number }
    const newBalance = Math.max(0, customer.points_balance - earned)
    db.prepare(`UPDATE customers SET points_balance = ? WHERE id = ?`).run(newBalance, customerId)
    db.prepare(`INSERT INTO customer_points_log (customer_id, type, amount, ref_order_id, note) VALUES (?, 'redeemed', ?, ?, ?)`).run(customerId, -earned, orderId, '退貨扣除')
    db.prepare(`UPDATE sales_orders SET points_earned = 0 WHERE id = ?`).run(orderId)
  } catch { /* 靜默忽略 */ }
}

function recordSaleHistory(orderId: number, fromStatus: string | null, toStatus: string, note?: string) {
  const db = getDb()
  db.prepare(
    `INSERT INTO sale_status_history (order_id, from_status, to_status, note) VALUES (?, ?, ?, ?)`
  ).run(orderId, fromStatus, toStatus, note ?? null)
}

export function registerSalesIpc(): void {
  ipcMain.handle('sales:getAll', (_e, filters) => SaleModel.findAll(filters))
  ipcMain.handle('sales:getById', (_e, id: number) => SaleModel.findById(id))
  ipcMain.handle('sales:create', (_e, data) => {
    const order = SaleModel.create(data)
    recordSaleHistory(order.id, null, 'pending')
    return order
  })
  ipcMain.handle('sales:complete', (_e, id: number) => {
    try {
      // 取得售出的商品 ID，用於完成後檢查庫存
      const order = SaleModel.findById(id)
      const soldProductIds = (order?.items ?? []).map((i) => i.product_id)

      const result = SaleModel.complete(id)
      if (result) {
        notifyLowStockAfterSale(soldProductIds)
        if (order) recordSaleHistory(id, order.status, 'completed')
        if (order?.customer_id) awardPoints(id, order.customer_id, order.total_amount)
      }
      return { success: true, data: result }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
  ipcMain.handle('sales:cancel', (_e, id: number) => {
    const order = SaleModel.findById(id)
    const result = SaleModel.cancel(id)
    if (order) recordSaleHistory(id, order.status, 'cancelled')
    return result
  })
  ipcMain.handle('sales:return', (_e, id: number) => {
    try {
      const order = SaleModel.findById(id)
      const result = SaleModel.return(id)
      if (order) {
        recordSaleHistory(id, order.status, 'returned')
        if (order.customer_id) revokePoints(id, order.customer_id)
      }
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
  ipcMain.handle('sales:batchComplete', (_e, ids: number[]) => {
    let completed = 0
    let skipped = 0
    for (const id of ids) {
      try {
        const order = SaleModel.findById(id)
        if (!order || order.status !== 'pending') { skipped++; continue }
        const result = SaleModel.complete(id)
        if (result) {
          notifyLowStockAfterSale((order.items ?? []).map((i) => i.product_id))
          recordSaleHistory(id, order.status, 'completed')
          if (order.customer_id) awardPoints(id, order.customer_id, order.total_amount)
          completed++
        } else { skipped++ }
      } catch { skipped++ }
    }
    return { completed, skipped }
  })
  ipcMain.handle('sales:batchCancel', (_e, ids: number[]) => {
    let cancelled = 0
    let skipped = 0
    for (const id of ids) {
      try {
        const order = SaleModel.findById(id)
        if (!order || order.status !== 'pending') { skipped++; continue }
        SaleModel.cancel(id)
        recordSaleHistory(id, order.status, 'cancelled')
        cancelled++
      } catch { skipped++ }
    }
    return { cancelled, skipped }
  })
  ipcMain.handle('sales:getStatusHistory', (_e, orderId: number) => {
    const db = getDb()
    return db.prepare(
      `SELECT id, order_id, from_status, to_status, changed_at, note FROM sale_status_history WHERE order_id = ? ORDER BY changed_at DESC`
    ).all(orderId)
  })
  ipcMain.handle('sales:updateNotes', (_e, id: number, notes: string) => {
    const db = getDb()
    db.prepare(`UPDATE sales_orders SET notes=? WHERE id=?`).run(notes, id)
    return SaleModel.findById(id)
  })
}
