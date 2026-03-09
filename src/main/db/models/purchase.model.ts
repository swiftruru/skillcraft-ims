import { getDb } from '../index'
import type { PurchaseOrder, PurchaseOrderCreate } from '../schema'

function generateOrderNo(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `PO-${y}${m}-${rand}`
}

export const PurchaseModel = {
  findAll(filters?: { status?: string; search?: string }): PurchaseOrder[] {
    const db = getDb()
    let query = `
      SELECT po.*, s.name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE 1=1
    `
    const params: unknown[] = []
    if (filters?.status) {
      query += ' AND po.status = ?'
      params.push(filters.status)
    }
    if (filters?.search) {
      query += ' AND (po.order_no LIKE ? OR s.name LIKE ?)'
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }
    query += ' ORDER BY po.created_at DESC'
    return db.prepare(query).all(...params) as PurchaseOrder[]
  },

  findById(id: number): PurchaseOrder | null {
    const db = getDb()
    const order = db
      .prepare(
        `SELECT po.*, s.name as supplier_name
         FROM purchase_orders po
         LEFT JOIN suppliers s ON po.supplier_id = s.id
         WHERE po.id = ?`
      )
      .get(id) as PurchaseOrder | undefined

    if (!order) return null

    order.items = db
      .prepare(
        `SELECT pi.*, p.name as product_name, p.sku as product_sku,
                (pi.quantity * pi.unit_price) as subtotal
         FROM purchase_items pi
         JOIN products p ON pi.product_id = p.id
         WHERE pi.purchase_order_id = ?`
      )
      .all(id) as typeof order.items

    return order
  },

  create(data: PurchaseOrderCreate): PurchaseOrder {
    const db = getDb()
    const orderNo = generateOrderNo()
    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

    const insertOrder = db.prepare(
      `INSERT INTO purchase_orders (order_no, supplier_id, order_date, total_amount, notes)
       VALUES (@order_no, @supplier_id, @order_date, @total_amount, @notes)`
    )
    const insertItem = db.prepare(
      `INSERT INTO purchase_items (purchase_order_id, product_id, quantity, unit_price)
       VALUES (@purchase_order_id, @product_id, @quantity, @unit_price)`
    )

    const createTransaction = db.transaction(() => {
      const result = insertOrder.run({
        order_no: orderNo,
        supplier_id: data.supplier_id,
        order_date: data.order_date,
        total_amount: totalAmount,
        notes: data.notes
      })
      const orderId = result.lastInsertRowid as number
      for (const item of data.items) {
        insertItem.run({ purchase_order_id: orderId, ...item })
      }
      return orderId
    })

    const orderId = createTransaction()
    return this.findById(orderId)!
  },

  receive(id: number): PurchaseOrder | null {
    const db = getDb()
    const order = this.findById(id)
    if (!order || order.status !== 'pending') return null

    const updateOrder = db.prepare(
      `UPDATE purchase_orders SET status = 'received', receive_date = date('now') WHERE id = ?`
    )
    const updateStock = db.prepare(
      `UPDATE products SET stock_qty = stock_qty + ?, updated_at = datetime('now') WHERE id = ?`
    )

    db.transaction(() => {
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
      .prepare(`UPDATE purchase_orders SET status = 'cancelled' WHERE id = ? AND status = 'pending'`)
      .run(id)
    return result.changes > 0
  },

  return(id: number): PurchaseOrder | null {
    const db = getDb()
    const order = this.findById(id)
    if (!order || order.status !== 'received') throw new Error('只有已收貨的採購單可以退貨')

    const updateOrder = db.prepare(
      `UPDATE purchase_orders SET status = 'returned' WHERE id = ? AND status = 'received'`
    )
    const checkStock = db.prepare('SELECT stock_qty FROM products WHERE id = ?')
    const deductStock = db.prepare(
      `UPDATE products SET stock_qty = stock_qty - ?, updated_at = datetime('now') WHERE id = ?`
    )
    const insertAdj = db.prepare(
      `INSERT INTO inventory_adjustments (product_id, delta, reason, note, adjusted_at)
       VALUES (?, ?, '採購退貨', ?, datetime('now'))`
    )

    db.transaction(() => {
      const changed = updateOrder.run(id).changes
      if (changed === 0) throw new Error('退貨失敗：狀態不符')
      for (const item of order.items ?? []) {
        const product = checkStock.get(item.product_id) as { stock_qty: number }
        if (!product || product.stock_qty < item.quantity) {
          throw new Error(
            `庫存不足：商品 ID ${item.product_id} 現有庫存 ${product?.stock_qty ?? 0}，無法退貨 ${item.quantity}`
          )
        }
        deductStock.run(item.quantity, item.product_id)
        insertAdj.run(item.product_id, -item.quantity, `採購退貨 ${order.order_no}`)
      }
    })()

    return this.findById(id)
  },

  delete(id: number): boolean {
    const db = getDb()
    const order = this.findById(id)
    if (!order || order.status === 'received' || order.status === 'returned') return false
    return db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(id).changes > 0
  }
}
