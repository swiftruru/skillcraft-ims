import { ipcMain } from 'electron'
import { ProductModel } from '../db/models/product.model'

export function registerProductsIpc(): void {
  ipcMain.handle('products:getAll', (_e, filters) => {
    return ProductModel.findAll(filters)
  })

  ipcMain.handle('products:getById', (_e, id: number) => {
    return ProductModel.findById(id)
  })

  ipcMain.handle('products:create', (_e, data) => {
    return ProductModel.create(data)
  })

  ipcMain.handle('products:update', (_e, id: number, data) => {
    return ProductModel.update(id, data)
  })

  ipcMain.handle('products:delete', (_e, id: number) => {
    return ProductModel.delete(id)
  })

  ipcMain.handle('products:getCategories', () => {
    return ProductModel.getCategories()
  })

  ipcMain.handle('products:getLowStock', () => {
    return ProductModel.getLowStockItems()
  })

  ipcMain.handle('products:adjust', (_e, productId: number, delta: number, reason: string, note?: string) => {
    return ProductModel.adjust(productId, delta, reason, note)
  })

  ipcMain.handle('products:getAdjustmentHistory', (_e, productId: number) => {
    return ProductModel.getAdjustmentHistory(productId)
  })
}
