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

  ipcMain.handle('customers:getPointsLog', (_e, customerId: number) => {
    return getDb().prepare(`
      SELECT l.*, s.order_no
      FROM customer_points_log l
      LEFT JOIN sales_orders s ON l.ref_order_id = s.id
      WHERE l.customer_id = ?
      ORDER BY l.created_at DESC
      LIMIT 50
    `).all(customerId)
  })

  ipcMain.handle('customers:adjustPoints', (_e, customerId: number, amount: number, note: string) => {
    const db = getDb()
    const customer = db.prepare(`SELECT points_balance FROM customers WHERE id = ?`).get(customerId) as { points_balance: number }
    const newBalance = Math.max(0, customer.points_balance + amount)
    db.prepare(`UPDATE customers SET points_balance = ? WHERE id = ?`).run(newBalance, customerId)
    db.prepare(`INSERT INTO customer_points_log (customer_id, type, amount, note) VALUES (?, 'adjusted', ?, ?)`).run(customerId, amount, note)
    return { points_balance: newBalance }
  })

  ipcMain.handle('customers:batchDelete', (_e, ids: number[]) => {
    const db = getDb()
    const stmt = db.prepare(`DELETE FROM customers WHERE id = ?`)
    let deleted = 0
    for (const id of ids) {
      stmt.run(id)
      deleted++
    }
    return { deleted }
  })
}
