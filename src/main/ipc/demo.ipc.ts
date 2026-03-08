import { ipcMain } from 'electron'
import { getDb } from '../db/index'

/** 強制刪除所有 Demo 標記資料，不受訂單狀態限制 */
export function registerDemoIpc(): void {
  ipcMain.handle('demo:purge', () => {
    const db = getDb()
    db.prepare(`DELETE FROM purchase_items
      WHERE purchase_order_id IN (
        SELECT id FROM purchase_orders WHERE notes LIKE 'Live Demo%'
      )`).run()
    db.prepare(`DELETE FROM purchase_orders WHERE notes LIKE 'Live Demo%'`).run()

    db.prepare(`DELETE FROM sale_items
      WHERE sales_order_id IN (
        SELECT id FROM sales_orders WHERE notes LIKE 'Live Demo%'
      )`).run()
    db.prepare(`DELETE FROM sales_orders WHERE notes LIKE 'Live Demo%'`).run()

    db.prepare(`DELETE FROM products WHERE name LIKE '[Demo]%'`).run()
    db.prepare(`DELETE FROM customers WHERE name LIKE '[Demo]%'`).run()
    db.prepare(`DELETE FROM suppliers WHERE name LIKE '[Demo]%'`).run()
  })
}
