import { ipcMain } from 'electron'
import { getDb } from '../db'

export function registerReportsIpc(): void {
  ipcMain.handle('reports:kpis', () => {
    const db = getDb()

    const inventoryValue = (
      db.prepare('SELECT COALESCE(SUM(stock_qty * buy_price), 0) as val FROM products').get() as { val: number }
    ).val

    const monthlyRevenue = (
      db
        .prepare(
          `SELECT COALESCE(SUM(total_amount), 0) as val FROM sales_orders
           WHERE status = 'completed' AND strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now')`
        )
        .get() as { val: number }
    ).val

    const prevMonthRevenue = (
      db
        .prepare(
          `SELECT COALESCE(SUM(total_amount), 0) as val FROM sales_orders
           WHERE status = 'completed' AND strftime('%Y-%m', order_date) = strftime('%Y-%m', date('now', '-1 month'))`
        )
        .get() as { val: number }
    ).val

    const monthlyGrossProfit = (
      db
        .prepare(
          `SELECT COALESCE(SUM((si.unit_price - p.buy_price) * si.quantity), 0) as val
           FROM sale_items si
           JOIN products p ON si.product_id = p.id
           JOIN sales_orders so ON si.sales_order_id = so.id
           WHERE so.status = 'completed' AND strftime('%Y-%m', so.order_date) = strftime('%Y-%m', 'now')`
        )
        .get() as { val: number }
    ).val

    const prevMonthGrossProfit = (
      db
        .prepare(
          `SELECT COALESCE(SUM((si.unit_price - p.buy_price) * si.quantity), 0) as val
           FROM sale_items si
           JOIN products p ON si.product_id = p.id
           JOIN sales_orders so ON si.sales_order_id = so.id
           WHERE so.status = 'completed' AND strftime('%Y-%m', so.order_date) = strftime('%Y-%m', date('now', '-1 month'))`
        )
        .get() as { val: number }
    ).val

    const lowStockCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM products WHERE stock_qty <= reorder_pt').get() as {
        cnt: number
      }
    ).cnt

    const totalProducts = (
      db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number }
    ).cnt

    const pendingSalesOrders = (
      db
        .prepare(`SELECT COUNT(*) as cnt FROM sales_orders WHERE status = 'pending'`)
        .get() as { cnt: number }
    ).cnt

    const pendingPurchasesCount = (
      db
        .prepare(`SELECT COUNT(*) as cnt FROM purchase_orders WHERE status = 'pending'`)
        .get() as { cnt: number }
    ).cnt

    return {
      totalInventoryValue: inventoryValue,
      monthlyRevenue,
      monthlyRevenuePrev: prevMonthRevenue,
      monthlyGrossProfit,
      monthlyGrossProfitPrev: prevMonthGrossProfit,
      lowStockCount,
      totalProducts,
      pendingSalesOrders,
      pendingPurchasesCount
    }
  })

  ipcMain.handle('reports:salesTrend', (_e, days = 30) => {
    const db = getDb()
    return db
      .prepare(
        `SELECT order_date as date,
                COALESCE(SUM(total_amount), 0) as revenue,
                COUNT(*) as orders
         FROM sales_orders
         WHERE status = 'completed' AND order_date >= date('now', '-' || ? || ' days')
         GROUP BY order_date
         ORDER BY order_date ASC`
      )
      .all(days)
  })

  ipcMain.handle('reports:inventoryByCategory', () => {
    const db = getDb()
    return db
      .prepare(
        `SELECT category,
                COUNT(*) as product_count,
                SUM(stock_qty) as total_units,
                ROUND(SUM(stock_qty * buy_price), 2) as inventory_value
         FROM products
         GROUP BY category
         ORDER BY inventory_value DESC`
      )
      .all()
  })

  ipcMain.handle('reports:topProducts', (_e, days = 30) => {
    const db = getDb()
    return db
      .prepare(
        `SELECT p.id as product_id, p.sku, p.name, p.category,
                SUM(si.quantity) as total_quantity,
                ROUND(SUM(si.quantity * si.unit_price), 2) as total_revenue
         FROM sale_items si
         JOIN products p ON si.product_id = p.id
         JOIN sales_orders so ON si.sales_order_id = so.id
         WHERE so.status = 'completed' AND so.order_date >= date('now', '-' || ? || ' days')
         GROUP BY p.id
         ORDER BY total_revenue DESC
         LIMIT 10`
      )
      .all(days)
  })

  ipcMain.handle('reports:lowStock', () => {
    const db = getDb()
    return db
      .prepare(
        `SELECT id, sku, name, category, stock_qty, reorder_pt, buy_price
         FROM products WHERE stock_qty <= reorder_pt
         ORDER BY (stock_qty * 1.0 / MAX(reorder_pt, 1)) ASC`
      )
      .all()
  })

  ipcMain.handle('reports:marginAnalysis', () => {
    const db = getDb()
    return db
      .prepare(
        `SELECT id, sku, name, category, sell_price, buy_price, stock_qty,
                ROUND(sell_price - buy_price, 2) as margin,
                ROUND((sell_price - buy_price) * 100.0 / NULLIF(sell_price, 0), 1) as margin_pct
         FROM products
         ORDER BY margin_pct DESC`
      )
      .all()
  })

  ipcMain.handle('reports:supplierStats', () => {
    const db = getDb()
    return db
      .prepare(
        `SELECT s.id, s.name,
                COUNT(po.id) as order_count,
                COALESCE(SUM(CASE WHEN po.status='received' THEN po.total_amount ELSE 0 END), 0) as total_received,
                COALESCE(SUM(po.total_amount), 0) as total_ordered
         FROM suppliers s
         LEFT JOIN purchase_orders po ON po.supplier_id = s.id
         GROUP BY s.id ORDER BY total_received DESC`
      )
      .all()
  })

  ipcMain.handle('reports:customerStats', () => {
    const db = getDb()
    return db
      .prepare(
        `SELECT c.id, c.name,
                COUNT(so.id) as order_count,
                COALESCE(SUM(CASE WHEN so.status='completed' THEN so.total_amount ELSE 0 END), 0) as total_spent,
                COALESCE(SUM(so.total_amount), 0) as total_ordered
         FROM customers c
         LEFT JOIN sales_orders so ON so.customer_id = c.id
         GROUP BY c.id ORDER BY total_spent DESC`
      )
      .all()
  })

  ipcMain.handle('reports:slowMoving', (_e, days: number = 60) => {
    const db = getDb()
    return db
      .prepare(
        `SELECT id, name, sku, category, stock_qty, buy_price, updated_at,
                CAST(julianday('now') - julianday(updated_at) AS INTEGER) as days_idle,
                ROUND(stock_qty * buy_price, 2) as stock_value
         FROM products
         WHERE stock_qty > 0
           AND updated_at < datetime('now', '-' || ? || ' days')
         ORDER BY days_idle DESC`
      )
      .all(days)
  })
}
