import { ipcMain } from 'electron'
import { getDb } from '../db'

export function registerReportsIpc(): void {
  ipcMain.handle('reports:kpis', () => {
    const db = getDb()

    const inventoryValue = (
      db.prepare('SELECT COALESCE(SUM(stock_qty * COALESCE(NULLIF(avg_cost, 0), buy_price)), 0) as val FROM products').get() as { val: number }
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
          `SELECT COALESCE(SUM((si.unit_price - COALESCE(NULLIF(p.avg_cost, 0), p.buy_price)) * si.quantity), 0) as val
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
          `SELECT COALESCE(SUM((si.unit_price - COALESCE(NULLIF(p.avg_cost, 0), p.buy_price)) * si.quantity), 0) as val
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

    const unpaidSalesTotal = (
      db
        .prepare(`SELECT COALESCE(SUM(total_amount), 0) as val FROM sales_orders WHERE status = 'completed' AND payment_status = 'unpaid'`)
        .get() as { val: number }
    ).val

    const unpaidPurchasesTotal = (
      db
        .prepare(`SELECT COALESCE(SUM(total_amount), 0) as val FROM purchase_orders WHERE status = 'received' AND payment_status = 'unpaid'`)
        .get() as { val: number }
    ).val

    return {
      totalInventoryValue: inventoryValue,
      monthlyRevenue,
      monthlyRevenuePrev: prevMonthRevenue,
      monthlyGrossProfit,
      monthlyGrossProfitPrev: prevMonthGrossProfit,
      lowStockCount,
      totalProducts,
      pendingSalesOrders,
      pendingPurchasesCount,
      unpaidSalesTotal,
      unpaidPurchasesTotal
    }
  })

  ipcMain.handle('reports:salesTrend', (_e, days = 30, dateFrom?: string, dateTo?: string) => {
    const db = getDb()
    if (dateFrom && dateTo) {
      return db
        .prepare(
          `SELECT order_date as date,
                  COALESCE(SUM(total_amount), 0) as revenue,
                  COUNT(*) as orders
           FROM sales_orders
           WHERE status = 'completed' AND order_date BETWEEN ? AND ?
           GROUP BY order_date
           ORDER BY order_date ASC`
        )
        .all(dateFrom, dateTo)
    }
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

  ipcMain.handle('reports:topProducts', (_e, days = 30, dateFrom?: string, dateTo?: string) => {
    const db = getDb()
    if (dateFrom && dateTo) {
      return db
        .prepare(
          `SELECT p.id as product_id, p.sku, p.name, p.category,
                  SUM(si.quantity) as total_quantity,
                  ROUND(SUM(si.quantity * si.unit_price), 2) as total_revenue
           FROM sale_items si
           JOIN products p ON si.product_id = p.id
           JOIN sales_orders so ON si.sales_order_id = so.id
           WHERE so.status = 'completed' AND so.order_date BETWEEN ? AND ?
           GROUP BY p.id
           ORDER BY total_revenue DESC
           LIMIT 10`
        )
        .all(dateFrom, dateTo)
    }
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
        `SELECT id, sku, name, category, sell_price, buy_price, avg_cost, stock_qty,
                ROUND(sell_price - COALESCE(NULLIF(avg_cost, 0), buy_price), 2) as margin,
                ROUND((sell_price - COALESCE(NULLIF(avg_cost, 0), buy_price)) * 100.0 / NULLIF(sell_price, 0), 1) as margin_pct
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

  ipcMain.handle('reports:turnoverAnalysis', (_e, days: number = 30) => {
    const db = getDb()
    return db
      .prepare(
        `SELECT p.id as product_id, p.sku, p.name, p.category,
                p.stock_qty,
                COALESCE(SUM(si.quantity), 0) as sold_qty,
                ROUND(COALESCE(SUM(si.quantity), 0) * 1.0 / NULLIF(p.stock_qty, 0), 2) as turnover_rate,
                CASE
                  WHEN COALESCE(SUM(si.quantity), 0) = 0 THEN NULL
                  ELSE ROUND(p.stock_qty * ? * 1.0 / SUM(si.quantity))
                END as days_to_sell
         FROM products p
         LEFT JOIN sale_items si ON si.product_id = p.id
         LEFT JOIN sales_orders so ON si.sales_order_id = so.id
           AND so.status = 'completed'
           AND so.order_date >= date('now', '-' || ? || ' days')
         WHERE p.stock_qty > 0
         GROUP BY p.id
         ORDER BY turnover_rate DESC NULLS LAST`
      )
      .all(days, days)
  })

  ipcMain.handle('reports:purchaseVsSales', (_e, days: number = 30, dateFrom?: string, dateTo?: string) => {
    const db = getDb()
    if (dateFrom && dateTo) {
      return db
        .prepare(
          `SELECT date_series.date,
                  COALESCE(p.purchase_amount, 0) as purchase_amount,
                  COALESCE(s.sales_amount, 0) as sales_amount
           FROM (
             SELECT order_date as date FROM purchase_orders WHERE order_date BETWEEN ? AND ?
             UNION
             SELECT order_date as date FROM sales_orders WHERE order_date BETWEEN ? AND ?
           ) date_series
           LEFT JOIN (
             SELECT order_date, COALESCE(SUM(total_amount), 0) as purchase_amount
             FROM purchase_orders WHERE status = 'received' AND order_date BETWEEN ? AND ?
             GROUP BY order_date
           ) p ON p.order_date = date_series.date
           LEFT JOIN (
             SELECT order_date, COALESCE(SUM(total_amount), 0) as sales_amount
             FROM sales_orders WHERE status = 'completed' AND order_date BETWEEN ? AND ?
             GROUP BY order_date
           ) s ON s.order_date = date_series.date
           GROUP BY date_series.date
           ORDER BY date_series.date ASC`
        )
        .all(dateFrom, dateTo, dateFrom, dateTo, dateFrom, dateTo, dateFrom, dateTo)
    }
    return db
      .prepare(
        `SELECT date_series.date,
                COALESCE(p.purchase_amount, 0) as purchase_amount,
                COALESCE(s.sales_amount, 0) as sales_amount
         FROM (
           SELECT order_date as date FROM purchase_orders WHERE order_date >= date('now', '-' || ? || ' days')
           UNION
           SELECT order_date as date FROM sales_orders WHERE order_date >= date('now', '-' || ? || ' days')
         ) date_series
         LEFT JOIN (
           SELECT order_date, COALESCE(SUM(total_amount), 0) as purchase_amount
           FROM purchase_orders WHERE status = 'received' AND order_date >= date('now', '-' || ? || ' days')
           GROUP BY order_date
         ) p ON p.order_date = date_series.date
         LEFT JOIN (
           SELECT order_date, COALESCE(SUM(total_amount), 0) as sales_amount
           FROM sales_orders WHERE status = 'completed' AND order_date >= date('now', '-' || ? || ' days')
           GROUP BY order_date
         ) s ON s.order_date = date_series.date
         GROUP BY date_series.date
         ORDER BY date_series.date ASC`
      )
      .all(days, days, days, days)
  })

  ipcMain.handle('reports:abcAnalysis', () => {
    const db = getDb()
    return db
      .prepare(
        `WITH product_revenue AS (
           SELECT p.id as product_id, p.sku, p.name, p.category,
                  COALESCE(SUM(si.unit_price * si.quantity), 0) as revenue
           FROM products p
           LEFT JOIN sale_items si ON si.product_id = p.id
           LEFT JOIN sales_orders so ON si.sales_order_id = so.id AND so.status = 'completed'
           GROUP BY p.id
           HAVING revenue > 0
         ),
         totals AS (SELECT SUM(revenue) as total FROM product_revenue),
         ranked AS (
           SELECT pr.*,
                  SUM(pr.revenue) OVER (ORDER BY pr.revenue DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative
           FROM product_revenue pr
         )
         SELECT r.product_id, r.sku, r.name, r.category, r.revenue,
                ROUND(r.revenue * 100.0 / t.total, 1) as revenue_pct,
                ROUND(r.cumulative * 100.0 / t.total, 1) as cumulative_pct,
                CASE
                  WHEN r.cumulative <= t.total * 0.7 THEN 'A'
                  WHEN r.cumulative <= t.total * 0.9 THEN 'B'
                  ELSE 'C'
                END as abc_class
         FROM ranked r, totals t
         ORDER BY r.revenue DESC`
      )
      .all()
  })

  ipcMain.handle('reports:monthlyPL', () => {
    const db = getDb()
    return db
      .prepare(
        `WITH RECURSIVE months(m) AS (
           SELECT strftime('%Y-%m', date('now', '-11 months'))
           UNION ALL
           SELECT strftime('%Y-%m', date(m || '-01', '+1 month'))
           FROM months WHERE m < strftime('%Y-%m', 'now')
         )
         SELECT
           m.m as month,
           COALESCE(s.revenue, 0) as revenue,
           COALESCE(c.cost, 0) as cost,
           ROUND(COALESCE(s.revenue, 0) - COALESCE(c.cost, 0), 2) as gross_profit
         FROM months m
         LEFT JOIN (
           SELECT strftime('%Y-%m', order_date) as mo, SUM(total_amount) as revenue
           FROM sales_orders WHERE status = 'completed'
           GROUP BY mo
         ) s ON s.mo = m.m
         LEFT JOIN (
           SELECT strftime('%Y-%m', so.order_date) as mo,
                  SUM(si.quantity * COALESCE(NULLIF(p.avg_cost, 0), p.buy_price)) as cost
           FROM sale_items si
           JOIN products p ON si.product_id = p.id
           JOIN sales_orders so ON si.sales_order_id = so.id AND so.status = 'completed'
           GROUP BY mo
         ) c ON c.mo = m.m
         ORDER BY m.m ASC`
      )
      .all()
  })

  ipcMain.handle('reports:topCustomers', () => {
    const db = getDb()
    return db
      .prepare(
        `SELECT c.id as customer_id, c.name,
                COUNT(so.id) as order_count,
                COALESCE(SUM(so.total_amount), 0) as total_spent
         FROM customers c
         JOIN sales_orders so ON so.customer_id = c.id
         WHERE so.status IN ('completed', 'returned')
         GROUP BY c.id
         ORDER BY total_spent DESC
         LIMIT 10`
      )
      .all()
  })
}
