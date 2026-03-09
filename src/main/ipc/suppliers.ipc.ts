import { ipcMain } from 'electron'
import { SupplierModel } from '../db/models/supplier.model'
import { getDb } from '../db/index'

export function registerSuppliersIpc(): void {
  ipcMain.handle('suppliers:getAll', (_e, search?: string) => SupplierModel.findAll(search))
  ipcMain.handle('suppliers:getById', (_e, id: number) => SupplierModel.findById(id))
  ipcMain.handle('suppliers:create', (_e, data) => SupplierModel.create(data))
  ipcMain.handle('suppliers:update', (_e, id: number, data) => SupplierModel.update(id, data))
  ipcMain.handle('suppliers:delete', (_e, id: number) => SupplierModel.delete(id))
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
}
