import { ipcMain } from 'electron'
import { PurchaseModel } from '../db/models/purchase.model'

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
}
