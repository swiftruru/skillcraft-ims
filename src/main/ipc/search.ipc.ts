import { ipcMain } from 'electron'
import { getDb } from '../db'

interface SearchResult {
  type: 'product' | 'supplier' | 'customer' | 'purchase' | 'sale'
  id: number
  title: string
  subtitle: string
  meta?: string
}

export function registerSearchIpc(): void {
  ipcMain.handle('search:global', (_e, query: string) => {
    if (!query || query.trim().length < 1) return []
    const db = getDb()
    const q = `%${query.trim()}%`
    const results: SearchResult[] = []

    // Products
    const products = db
      .prepare(`SELECT id, name, sku, category, stock_qty, unit FROM products WHERE name LIKE ? OR sku LIKE ? LIMIT 5`)
      .all(q, q) as { id: number; name: string; sku: string; category: string; stock_qty: number; unit: string }[]
    for (const p of products) {
      results.push({ type: 'product', id: p.id, title: p.name, subtitle: p.sku, meta: `${p.category} · 庫存 ${p.stock_qty} ${p.unit}` })
    }

    // Suppliers
    const suppliers = db
      .prepare(`SELECT id, name, contact, phone FROM suppliers WHERE name LIKE ? OR contact LIKE ? LIMIT 3`)
      .all(q, q) as { id: number; name: string; contact: string | null; phone: string | null }[]
    for (const s of suppliers) {
      results.push({ type: 'supplier', id: s.id, title: s.name, subtitle: '供應商', meta: s.phone ?? undefined })
    }

    // Customers
    const customers = db
      .prepare(`SELECT id, name, contact, phone FROM customers WHERE name LIKE ? OR contact LIKE ? LIMIT 3`)
      .all(q, q) as { id: number; name: string; contact: string | null; phone: string | null }[]
    for (const c of customers) {
      results.push({ type: 'customer', id: c.id, title: c.name, subtitle: '客戶', meta: c.phone ?? undefined })
    }

    // Purchase orders
    const purchases = db
      .prepare(`SELECT id, order_no, status, total_amount FROM purchase_orders WHERE order_no LIKE ? LIMIT 3`)
      .all(q) as { id: number; order_no: string; status: string; total_amount: number }[]
    for (const po of purchases) {
      results.push({ type: 'purchase', id: po.id, title: po.order_no, subtitle: '採購單', meta: po.status })
    }

    // Sales orders
    const sales = db
      .prepare(`SELECT id, order_no, status, total_amount FROM sales_orders WHERE order_no LIKE ? LIMIT 3`)
      .all(q) as { id: number; order_no: string; status: string; total_amount: number }[]
    for (const so of sales) {
      results.push({ type: 'sale', id: so.id, title: so.order_no, subtitle: '銷售單', meta: so.status })
    }

    return results
  })
}
