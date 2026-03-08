import { ipcMain } from 'electron'
import { getDb } from '../db'
import { PurchaseModel } from '../db/models/purchase.model'

interface PurchaseSuggestion {
  product_id: number
  sku: string
  name: string
  category: string
  stock_qty: number
  reorder_pt: number
  suggested_qty: number
  buy_price: number
  estimated_cost: number
}

export function registerInventoryIpc(): void {
  // Returns purchase suggestions based on ims-inventory rule 8:
  // suggested_qty = MAX(reorder_pt * 2 - stock_qty, reorder_pt)
  ipcMain.handle('inventory:getPurchaseSuggestions', () => {
    const db = getDb()
    const items = db.prepare(`
      SELECT id as product_id, sku, name, category, stock_qty, reorder_pt, buy_price
      FROM products
      WHERE stock_qty <= reorder_pt AND reorder_pt > 0
      ORDER BY (stock_qty * 1.0 / MAX(reorder_pt, 1)) ASC
    `).all() as Omit<PurchaseSuggestion, 'suggested_qty' | 'estimated_cost'>[]

    return items.map((item) => {
      const suggested_qty = Math.max(item.reorder_pt * 2 - item.stock_qty, item.reorder_pt)
      return {
        ...item,
        suggested_qty,
        estimated_cost: suggested_qty * item.buy_price
      }
    })
  })

  // Creates a purchase order from selected suggestions
  ipcMain.handle('inventory:createPurchaseFromSuggestions', (_e, items: { product_id: number; quantity: number; unit_price: number }[]) => {
    return PurchaseModel.create({
      supplier_id: null,
      order_date: new Date().toISOString().slice(0, 10),
      notes: '採購建議自動產生',
      items
    })
  })
}
