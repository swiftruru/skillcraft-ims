import { ipcMain } from 'electron'
import { PurchaseModel } from '../db/models/purchase.model'
import { getDb } from '../db'

function recordPurchaseHistory(orderId: number, fromStatus: string | null, toStatus: string, note?: string) {
  const db = getDb()
  db.prepare(
    `INSERT INTO purchase_status_history (order_id, from_status, to_status, note) VALUES (?, ?, ?, ?)`
  ).run(orderId, fromStatus, toStatus, note ?? null)
}

export function registerPurchasesIpc(): void {
  ipcMain.handle('purchases:getAll', (_e, filters) => PurchaseModel.findAll(filters))
  ipcMain.handle('purchases:getById', (_e, id: number) => PurchaseModel.findById(id))
  ipcMain.handle('purchases:create', (_e, data) => {
    const order = PurchaseModel.create(data)
    recordPurchaseHistory(order.id, null, 'pending')
    return order
  })
  ipcMain.handle('purchases:receive', (_e, id: number) => {
    const order = PurchaseModel.findById(id)
    const result = PurchaseModel.receive(id)
    if (order) recordPurchaseHistory(id, order.status, 'received')
    return result
  })
  ipcMain.handle('purchases:cancel', (_e, id: number) => {
    const order = PurchaseModel.findById(id)
    const result = PurchaseModel.cancel(id)
    if (order) recordPurchaseHistory(id, order.status, 'cancelled')
    return result
  })
  ipcMain.handle('purchases:return', (_e, id: number) => {
    try {
      const order = PurchaseModel.findById(id)
      const data = PurchaseModel.return(id)
      if (order) recordPurchaseHistory(id, order.status, 'returned')
      return { success: true, data }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })
  ipcMain.handle('purchases:delete', (_e, id: number) => PurchaseModel.delete(id))
  ipcMain.handle('purchases:markPaid', (_e, id: number, paymentDueDate?: string) => {
    const db = getDb()
    const order = PurchaseModel.findById(id)
    if (!order || order.status !== 'received') throw new Error('只有已收貨的採購單可標記付款')
    const updates: Record<string, string> = { payment_status: 'paid' }
    if (paymentDueDate) updates.payment_due_date = paymentDueDate
    db.prepare(
      `UPDATE purchase_orders SET payment_status='paid' WHERE id=?`
    ).run(id)
    return PurchaseModel.findById(id)
  })
  ipcMain.handle('purchases:setPaymentDue', (_e, id: number, dueDate: string) => {
    const db = getDb()
    db.prepare(`UPDATE purchase_orders SET payment_due_date=? WHERE id=?`).run(dueDate, id)
    return PurchaseModel.findById(id)
  })
  ipcMain.handle('purchases:batchReceive', (_e, ids: number[]) => {
    let updated = 0
    for (const id of ids) {
      try {
        const order = PurchaseModel.findById(id)
        PurchaseModel.receive(id)
        if (order) recordPurchaseHistory(id, order.status, 'received')
        updated++
      } catch { /* skip invalid */ }
    }
    return { updated }
  })
  ipcMain.handle('purchases:batchCancel', (_e, ids: number[]) => {
    let cancelled = 0
    let skipped = 0
    for (const id of ids) {
      try {
        const order = PurchaseModel.findById(id)
        if (!order || order.status !== 'pending') { skipped++; continue }
        PurchaseModel.cancel(id)
        recordPurchaseHistory(id, order.status, 'cancelled')
        cancelled++
      } catch { skipped++ }
    }
    return { cancelled, skipped }
  })
  ipcMain.handle('purchases:getStatusHistory', (_e, orderId: number) => {
    const db = getDb()
    return db.prepare(
      `SELECT id, order_id, from_status, to_status, changed_at, note FROM purchase_status_history WHERE order_id = ? ORDER BY changed_at DESC`
    ).all(orderId)
  })
  ipcMain.handle('purchases:updateNotes', (_e, id: number, notes: string) => {
    const db = getDb()
    db.prepare(`UPDATE purchase_orders SET notes=? WHERE id=?`).run(notes, id)
    return PurchaseModel.findById(id)
  })
}
