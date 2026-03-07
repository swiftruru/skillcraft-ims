import { ipcMain } from 'electron'
import { CustomerModel } from '../db/models/customer.model'

export function registerCustomersIpc(): void {
  ipcMain.handle('customers:getAll', (_e, search?: string) => CustomerModel.findAll(search))
  ipcMain.handle('customers:getById', (_e, id: number) => CustomerModel.findById(id))
  ipcMain.handle('customers:create', (_e, data) => CustomerModel.create(data))
  ipcMain.handle('customers:update', (_e, id: number, data) => CustomerModel.update(id, data))
  ipcMain.handle('customers:delete', (_e, id: number) => CustomerModel.delete(id))
}
