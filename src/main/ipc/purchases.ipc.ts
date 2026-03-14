import { ipcMain } from 'electron'
import { PurchaseModel } from '../db/models/purchase.model'
import { getDb } from '../db'

export function registerPurchasesIpc(): void {
  ipcMain.handle('purchases:getAll', (_e, filters) => PurchaseModel.findAll(filters))
  ipcMain.handle('purchases:getById', (_e, id: number) => PurchaseModel.findById(id))
  ipcMain.handle('purchases:create', (_e, data) => PurchaseModel.create(data))
  ipcMain.handle('purchases:receive', (_e, id: number) => PurchaseModel.receive(id))
  ipcMain.handle('purchases:cancel', (_e, id: number) => PurchaseModel.cancel(id))
  ipcMain.handle('purchases:return', (_e, id: number) => {
    try {
      const data = PurchaseModel.return(id)
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
}
