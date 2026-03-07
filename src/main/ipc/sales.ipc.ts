import { ipcMain } from 'electron'
import { SaleModel } from '../db/models/sale.model'

export function registerSalesIpc(): void {
  ipcMain.handle('sales:getAll', (_e, filters) => SaleModel.findAll(filters))
  ipcMain.handle('sales:getById', (_e, id: number) => SaleModel.findById(id))
  ipcMain.handle('sales:create', (_e, data) => SaleModel.create(data))
  ipcMain.handle('sales:complete', (_e, id: number) => {
    try {
      return { success: true, data: SaleModel.complete(id) }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
  ipcMain.handle('sales:cancel', (_e, id: number) => SaleModel.cancel(id))
  ipcMain.handle('sales:delete', (_e, id: number) => SaleModel.delete(id))
}
