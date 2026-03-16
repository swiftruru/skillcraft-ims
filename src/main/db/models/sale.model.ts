import { getDb } from '../index'
import type { SalesOrder, SalesOrderCreate } from '../schema'

function generateOrderNo(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `SO-${y}${m}-${rand}`
}

export const SaleModel = {
  findAll(filters?: { status?: string; search?: string; dateFrom?: string; dateTo?: string }): SalesOrder[] {
    const db = getDb()
    let query = `
      SELECT so.*, c.name as customer_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE 1=1
    `
    const params: unknown[] = []
    if (filters?.status) {
      query += ' AND so.status = ?'
      params.push(filters.status)
    }
    if (filters?.search) {
      query += ' AND (so.order_no LIKE ? OR c.name LIKE ? OR so.notes LIKE ?)'
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
    }
    if (filters?.dateFrom) {
      query += ' AND so.order_date >= ?'
      params.push(filters.dateFrom)
    }
    if (filters?.dateTo) {
      query += ' AND so.order_date <= ?'
      params.push(filters.dateTo)
    }
    query += ' ORDER BY so.created_at DESC'
    return db.prepare(query).all(...params) as SalesOrder[]
  },

  findById(id: number): SalesOrder | null {
    const db = getDb()
    const order = db
      .prepare(
        `SELECT so.*, c.name as customer_name
         FROM sales_orders so
         LEFT JOIN customers c ON so.customer_id = c.id
         WHERE so.id = ?`
      )
      .get(id) as SalesOrder | undefined

    if (!order) return null

    order.items = db
      .prepare(
        `SELECT si.*, p.name as product_name, p.sku as product_sku,
                ROUND(si.quantity * si.unit_price * (1 - si.discount_pct / 100.0), 2) as subtotal
         FROM sale_items si
         JOIN products p ON si.product_id = p.id
         WHERE si.sales_order_id = ?`
      )
      .all(id) as typeof order.items

    return order
  },

  create(data: SalesOrderCreate): SalesOrder {
    const db = getDb()
    const orderNo = generateOrderNo()
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price * (1 - (item.discount_pct ?? 0) / 100),
      0
    )

    const insertOrder = db.prepare(
      `INSERT INTO sales_orders (order_no, customer_id, order_date, total_amount, notes, payment_due_date)
       VALUES (@order_no, @customer_id, @order_date, @total_amount, @notes, @payment_due_date)`
    )
    const insertItem = db.prepare(
      `INSERT INTO sale_items (sales_order_id, product_id, quantity, unit_price, discount_pct)
       VALUES (@sales_order_id, @product_id, @quantity, @unit_price, @discount_pct)`
    )

    const createTransaction = db.transaction(() => {
      const result = insertOrder.run({
        order_no: orderNo,
        customer_id: data.customer_id,
        order_date: data.order_date,
        total_amount: totalAmount,
        notes: data.notes,
        payment_due_date: data.payment_due_date ?? null
      })
      const orderId = result.lastInsertRowid as number
      for (const item of data.items) {
        insertItem.run({ sales_order_id: orderId, ...item, discount_pct: item.discount_pct ?? 0 })
      }
      return orderId
    })

    const orderId = createTransaction()
    return this.findById(orderId)!
  },

  complete(id: number): SalesOrder | null {
    const db = getDb()
    const order = this.findById(id)
    if (!order || order.status !== 'pending') return null

    const checkStock = db.prepare('SELECT stock_qty FROM products WHERE id = ?')
    const updateOrder = db.prepare(
      `UPDATE sales_orders SET status = 'completed' WHERE id = ?`
    )
    const updateStock = db.prepare(
      `UPDATE products SET stock_qty = stock_qty - ?, updated_at = datetime('now') WHERE id = ?`
    )

    db.transaction(() => {
      // Validate all items have enough stock
      for (const item of order.items ?? []) {
        const product = checkStock.get(item.product_id) as { stock_qty: number }
        if (!product || product.stock_qty < item.quantity) {
          throw new Error(
            `庫存不足：商品 ID ${item.product_id} 現有庫存 ${product?.stock_qty ?? 0}，需要 ${item.quantity}`
          )
        }
      }
      // All good, apply changes
      updateOrder.run(id)
      for (const item of order.items ?? []) {
        updateStock.run(item.quantity, item.product_id)
      }
    })()

    return this.findById(id)
  },

  cancel(id: number): boolean {
    const db = getDb()
    const result = db
      .prepare(`UPDATE sales_orders SET status = 'cancelled' WHERE id = ? AND status = 'pending'`)
      .run(id)
    return result.changes > 0
  },

  return(id: number): SalesOrder | null {
    const db = getDb()
    const order = this.findById(id)
    if (!order || order.status !== 'completed') throw new Error('只有已完成的銷售單可以退貨')

    const updateOrder = db.prepare(
      `UPDATE sales_orders SET status = 'returned' WHERE id = ? AND status = 'completed'`
    )
    const restoreStock = db.prepare(
      `UPDATE products SET stock_qty = stock_qty + ?, updated_at = datetime('now') WHERE id = ?`
    )
    const insertAdj = db.prepare(
      `INSERT INTO inventory_adjustments (product_id, delta, reason, note, adjusted_at)
       VALUES (?, ?, '退貨入庫', ?, datetime('now'))`
    )

    db.transaction(() => {
      const changed = updateOrder.run(id).changes
      if (changed === 0) throw new Error('退貨失敗：狀態不符')
      for (const item of order.items ?? []) {
        restoreStock.run(item.quantity, item.product_id)
        insertAdj.run(item.product_id, item.quantity, `銷售退貨 ${order.order_no}`)
      }
    })()

    return this.findById(id)
  },

  partialReturn(id: number, items: { itemId: number; returnQty: number }[]): SalesOrder | null {
    const db = getDb()
    const order = this.findById(id)
    if (!order || (order.status !== 'completed' && order.status !== 'partial_return')) {
      throw new Error('只有已完成或部分退貨的銷售單可以進行退貨')
    }
    if (!items || items.length === 0) throw new Error('請至少選擇一個退貨品項')

    const itemMap = new Map((order.items ?? []).map(i => [i.id, i]))

    // Validate all items before executing
    for (const { itemId, returnQty } of items) {
      if (returnQty <= 0) continue
      const item = itemMap.get(itemId)
      if (!item) throw new Error(`找不到品項 ID ${itemId}`)
      const alreadyReturned = item.return_qty ?? 0
      if (returnQty > item.quantity - alreadyReturned) {
        throw new Error(`${item.product_name ?? itemId} 退貨數量超過可退數量`)
      }
    }

    const updateItemQty = db.prepare(
      `UPDATE sale_items SET return_qty = return_qty + ? WHERE id = ?`
    )
    const restoreStock = db.prepare(
      `UPDATE products SET stock_qty = stock_qty + ?, updated_at = datetime('now') WHERE id = ?`
    )
    const insertAdj = db.prepare(
      `INSERT INTO inventory_adjustments (product_id, delta, reason, note, adjusted_at)
       VALUES (?, ?, '退貨入庫', ?, datetime('now'))`
    )
    const updateOrderStatus = db.prepare(
      `UPDATE sales_orders SET status = ? WHERE id = ?`
    )

    db.transaction(() => {
      for (const { itemId, returnQty } of items) {
        if (returnQty <= 0) continue
        const item = itemMap.get(itemId)!
        updateItemQty.run(returnQty, itemId)
        restoreStock.run(returnQty, item.product_id)
        insertAdj.run(item.product_id, returnQty, `部分退貨 ${order.order_no}`)
      }

      // Re-fetch items to check if fully returned
      const updatedItems = db.prepare(
        `SELECT quantity, return_qty FROM sale_items WHERE sales_order_id = ?`
      ).all(id) as { quantity: number; return_qty: number }[]
      const fullyReturned = updatedItems.every(i => (i.return_qty ?? 0) >= i.quantity)
      updateOrderStatus.run(fullyReturned ? 'returned' : 'partial_return', id)
    })()

    return this.findById(id)
  },

  delete(id: number): boolean {
    const db = getDb()
    const order = this.findById(id)
    if (!order || order.status === 'completed' || order.status === 'returned') return false
    return db.prepare('DELETE FROM sales_orders WHERE id = ?').run(id).changes > 0
  }
}
