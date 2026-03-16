import { ipcMain } from 'electron'
import { SupplierModel } from '../db/models/supplier.model'
import { getDb } from '../db/index'

export function registerSuppliersIpc(): void {
  ipcMain.handle('suppliers:getAll', (_e, search?: string) => SupplierModel.findAll(search))
  ipcMain.handle('suppliers:getById', (_e, id: number) => SupplierModel.findById(id))
  ipcMain.handle('suppliers:create', (_e, data) => SupplierModel.create(data))
  ipcMain.handle('suppliers:update', (_e, id: number, data) => SupplierModel.update(id, data))
  ipcMain.handle('suppliers:delete', (_e, id: number) => SupplierModel.delete(id))
  ipcMain.handle('suppliers:getOutstanding', (_e, supplierId: number) => {
    const db = getDb()
    const row = db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as outstanding
       FROM purchase_orders
       WHERE supplier_id = ? AND payment_status = 'unpaid' AND status = 'received'`
    ).get(supplierId) as { outstanding: number }
    return { outstanding: row.outstanding }
  })
  ipcMain.handle('suppliers:getOrders', (_e, supplierId: number) => {
    const db = getDb()
    return db.prepare(
      `SELECT po.*, s.name as supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.supplier_id = ?
       ORDER BY po.created_at DESC
       LIMIT 20`
    ).all(supplierId)
  })
  ipcMain.handle('suppliers:getStatement', (_e, supplierId: number, dateFrom: string, dateTo: string) => {
    const db = getDb()
    const orders = db.prepare(
      `SELECT po.*, s.name as supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.supplier_id = ? AND po.order_date BETWEEN ? AND ?
       ORDER BY po.order_date DESC`
    ).all(supplierId, dateFrom, dateTo) as { total_amount: number; payment_status: string }[]
    const totalAmount = orders.reduce((sum, o) => sum + o.total_amount, 0)
    const paidAmount = orders.filter((o) => o.payment_status === 'paid').reduce((sum, o) => sum + o.total_amount, 0)
    return { orders, totalAmount, paidAmount, balance: totalAmount - paidAmount }
  })
}
