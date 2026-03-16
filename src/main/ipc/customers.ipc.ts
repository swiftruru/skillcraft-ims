import { ipcMain } from 'electron'
import { CustomerModel } from '../db/models/customer.model'
import { getDb } from '../db/index'

export function registerCustomersIpc(): void {
  ipcMain.handle('customers:getAll', (_e, search?: string) => CustomerModel.findAll(search))
  ipcMain.handle('customers:getById', (_e, id: number) => CustomerModel.findById(id))
  ipcMain.handle('customers:create', (_e, data) => CustomerModel.create(data))
  ipcMain.handle('customers:update', (_e, id: number, data) => CustomerModel.update(id, data))
  ipcMain.handle('customers:delete', (_e, id: number) => CustomerModel.delete(id))
  ipcMain.handle('customers:getOutstanding', (_e, customerId: number) => {
    const db = getDb()
    const row = db.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as outstanding
       FROM sales_orders
       WHERE customer_id = ? AND payment_status = 'unpaid' AND status IN ('completed', 'partial_return')`
    ).get(customerId) as { outstanding: number }
    return { outstanding: row.outstanding }
  })
  ipcMain.handle('customers:getOrders', (_e, customerId: number) => {
    const db = getDb()
    return db.prepare(
      `SELECT so.*, c.name as customer_name
       FROM sales_orders so
       LEFT JOIN customers c ON so.customer_id = c.id
       WHERE so.customer_id = ?
       ORDER BY so.created_at DESC
       LIMIT 20`
    ).all(customerId)
  })
  ipcMain.handle('customers:getStatement', (_e, customerId: number, dateFrom: string, dateTo: string) => {
    const db = getDb()
    const orders = db.prepare(
      `SELECT so.*, c.name as customer_name
       FROM sales_orders so
       LEFT JOIN customers c ON so.customer_id = c.id
       WHERE so.customer_id = ? AND so.order_date BETWEEN ? AND ?
       ORDER BY so.order_date DESC`
    ).all(customerId, dateFrom, dateTo) as { total_amount: number; payment_status: string }[]
    const totalAmount = orders.reduce((sum, o) => sum + o.total_amount, 0)
    const paidAmount = orders.filter((o) => o.payment_status === 'paid').reduce((sum, o) => sum + o.total_amount, 0)
    return { orders, totalAmount, paidAmount, balance: totalAmount - paidAmount }
  })
}
