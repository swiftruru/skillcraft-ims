import { ipcMain } from 'electron'
import { SupplierModel } from '../db/models/supplier.model'

export function registerSuppliersIpc(): void {
  ipcMain.handle('suppliers:getAll', (_e, search?: string) => SupplierModel.findAll(search))
  ipcMain.handle('suppliers:getById', (_e, id: number) => SupplierModel.findById(id))
  ipcMain.handle('suppliers:create', (_e, data) => SupplierModel.create(data))
  ipcMain.handle('suppliers:update', (_e, id: number, data) => SupplierModel.update(id, data))
  ipcMain.handle('suppliers:delete', (_e, id: number) => SupplierModel.delete(id))
}
