import { ipcMain } from 'electron'
import { PurchaseModel } from '../db/models/purchase.model'

export function registerPurchasesIpc(): void {
  ipcMain.handle('purchases:getAll', (_e, filters) => PurchaseModel.findAll(filters))
  ipcMain.handle('purchases:getById', (_e, id: number) => PurchaseModel.findById(id))
  ipcMain.handle('purchases:create', (_e, data) => PurchaseModel.create(data))
  ipcMain.handle('purchases:receive', (_e, id: number) => PurchaseModel.receive(id))
  ipcMain.handle('purchases:cancel', (_e, id: number) => PurchaseModel.cancel(id))
  ipcMain.handle('purchases:delete', (_e, id: number) => PurchaseModel.delete(id))
}
