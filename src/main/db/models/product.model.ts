import { getDb } from '../index'
import type { Product, ProductCreate, ProductUpdate } from '../schema'

export const ProductModel = {
  findAll(filters?: { category?: string; search?: string; lowStock?: boolean }): Product[] {
    const db = getDb()
    let query = 'SELECT * FROM products WHERE 1=1'
    const params: unknown[] = []

    if (filters?.category) {
      query += ' AND category = ?'
      params.push(filters.category)
    }
    if (filters?.search) {
      query += ' AND (name LIKE ? OR sku LIKE ?)'
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }
    if (filters?.lowStock) {
      query += ' AND stock_qty <= reorder_pt'
    }

    query += ' ORDER BY category, name'
    return db.prepare(query).all(...params) as Product[]
  },

  findById(id: number): Product | null {
    const db = getDb()
    return (db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product) ?? null
  },

  findBySku(sku: string): Product | null {
    const db = getDb()
    return (db.prepare('SELECT * FROM products WHERE sku = ?').get(sku) as Product) ?? null
  },

  create(data: ProductCreate): Product {
    const db = getDb()
    const result = db
      .prepare(
        `INSERT INTO products (sku, name, category, sell_price, buy_price, stock_qty, reorder_pt, unit, description)
         VALUES (@sku, @name, @category, @sell_price, @buy_price, @stock_qty, @reorder_pt, @unit, @description)`
      )
      .run(data)
    return this.findById(result.lastInsertRowid as number)!
  },

  update(id: number, data: ProductUpdate): Product | null {
    const db = getDb()
    const product = this.findById(id)
    if (!product) return null

    const updated = { ...product, ...data, updated_at: new Date().toISOString() }
    db.prepare(
      `UPDATE products SET
        sku = @sku, name = @name, category = @category,
        sell_price = @sell_price, buy_price = @buy_price,
        stock_qty = @stock_qty, reorder_pt = @reorder_pt,
        unit = @unit, description = @description, updated_at = @updated_at
       WHERE id = @id`
    ).run({ ...updated, id })

    return this.findById(id)
  },

  delete(id: number): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id)
    return result.changes > 0
  },

  getCategories(): string[] {
    const db = getDb()
    return (db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all() as { category: string }[]).map(
      (r) => r.category
    )
  },

  getLowStockItems() {
    const db = getDb()
    return db
      .prepare(
        `SELECT id, sku, name, category, stock_qty, reorder_pt, buy_price
         FROM products WHERE stock_qty <= reorder_pt ORDER BY (stock_qty * 1.0 / MAX(reorder_pt, 1)) ASC`
      )
      .all()
  }
}
