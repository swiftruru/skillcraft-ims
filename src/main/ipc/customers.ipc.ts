import { ipcMain } from 'electron'
import { CustomerModel } from '../db/models/customer.model'
import { getDb } from '../db/index'

export function registerCustomersIpc(): void {
  ipcMain.handle('customers:getAll', (_e, search?: string) => CustomerModel.findAll(search))
  ipcMain.handle('customers:getById', (_e, id: number) => CustomerModel.findById(id))
  ipcMain.handle('customers:create', (_e, data) => CustomerModel.create(data))
  ipcMain.handle('customers:update', (_e, id: number, data) => CustomerModel.update(id, data))
  ipcMain.handle('customers:delete', (_e, id: number) => CustomerModel.delete(id))
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
}
