import { ipcMain, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { getDb } from '../db'

// UTF-8 BOM so Excel opens Chinese correctly
const BOM = '\uFEFF'

function escapeCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) lines.push(row.map(escapeCell).join(','))
  return BOM + lines.join('\r\n')
}

function formatDt(iso: string | null): string {
  if (!iso) return ''
  return iso.replace('T', ' ').slice(0, 16)
}

export function registerExportIpc(): void {
  ipcMain.handle('export:products', async () => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `skillcraft-products-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (!filePath) return { success: false }

    const db = getDb()
    const rows = db.prepare('SELECT sku, name, category, stock_qty, reorder_pt, unit, sell_price, buy_price, description, created_at FROM products ORDER BY category, name').all() as Record<string, unknown>[]
    const headers = ['SKU', '商品名稱', '類別', '庫存數量', '補貨點', '單位', '售價', '進價', '說明', '建立時間']
    const data = rows.map(r => [r.sku, r.name, r.category, r.stock_qty, r.reorder_pt, r.unit, r.sell_price, r.buy_price, r.description, formatDt(r.created_at as string)])

    writeFileSync(filePath, toCsv(headers, data), 'utf-8')
    return { success: true, filePath }
  })

  ipcMain.handle('export:purchases', async () => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `skillcraft-purchases-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (!filePath) return { success: false }

    const db = getDb()
    const rows = db.prepare(`
      SELECT po.order_no, s.name as supplier_name, po.status, po.order_date, po.receive_date,
             p.sku, p.name as product_name, pi.quantity, pi.unit_price, po.notes
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      JOIN purchase_items pi ON pi.purchase_order_id = po.id
      JOIN products p ON pi.product_id = p.id
      ORDER BY po.order_date DESC, po.order_no
    `).all() as Record<string, unknown>[]
    const headers = ['採購單號', '供應商', '狀態', '訂購日期', '收貨日期', 'SKU', '商品名稱', '數量', '進貨單價', '備註']
    const data = rows.map(r => [r.order_no, r.supplier_name, r.status, r.order_date, r.receive_date, r.sku, r.product_name, r.quantity, r.unit_price, r.notes])

    writeFileSync(filePath, toCsv(headers, data), 'utf-8')
    return { success: true, filePath }
  })

  ipcMain.handle('export:sales', async () => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `skillcraft-sales-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (!filePath) return { success: false }

    const db = getDb()
    const rows = db.prepare(`
      SELECT so.order_no, c.name as customer_name, so.status, so.order_date,
             p.sku, p.name as product_name, si.quantity, si.unit_price, so.notes
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      JOIN sale_items si ON si.sales_order_id = so.id
      JOIN products p ON si.product_id = p.id
      ORDER BY so.order_date DESC, so.order_no
    `).all() as Record<string, unknown>[]
    const headers = ['銷售單號', '客戶', '狀態', '訂購日期', 'SKU', '商品名稱', '數量', '銷售單價', '備註']
    const data = rows.map(r => [r.order_no, r.customer_name, r.status, r.order_date, r.sku, r.product_name, r.quantity, r.unit_price, r.notes])

    writeFileSync(filePath, toCsv(headers, data), 'utf-8')
    return { success: true, filePath }
  })

  ipcMain.handle('export:adjustments', async () => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `skillcraft-adjustments-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (!filePath) return { success: false }

    const db = getDb()
    const rows = db.prepare(`
      SELECT p.sku, p.name, a.delta, a.reason, a.note, a.adjusted_at
      FROM inventory_adjustments a JOIN products p ON a.product_id = p.id
      ORDER BY a.adjusted_at DESC
    `).all() as Record<string, unknown>[]
    const headers = ['SKU', '商品名稱', '調整量', '原因', '備註', '調整時間']
    const data = rows.map(r => [r.sku, r.name, r.delta, r.reason, r.note, formatDt(r.adjusted_at as string)])

    writeFileSync(filePath, toCsv(headers, data), 'utf-8')
    return { success: true, filePath }
  })

  ipcMain.handle('export:report', async (_e, days: number = 30) => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `skillcraft-report-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (!filePath) return { success: false }

    const db = getDb()
    const dateFrom = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

    const topProducts = db.prepare(`
      SELECT p.sku, p.name, p.category, SUM(si.quantity) as total_qty, SUM(si.quantity * si.unit_price) as total_revenue
      FROM sale_items si JOIN products p ON si.product_id = p.id
      JOIN sales_orders so ON si.sales_order_id = so.id
      WHERE so.status IN ('completed','partial_return') AND so.order_date >= ?
      GROUP BY p.id ORDER BY total_revenue DESC LIMIT 20
    `).all(dateFrom) as Record<string, unknown>[]

    const lowStock = db.prepare(`
      SELECT sku, name, category, stock_qty, reorder_pt, (reorder_pt - stock_qty) as gap
      FROM products WHERE stock_qty <= reorder_pt AND reorder_pt > 0 ORDER BY gap DESC
    `).all() as Record<string, unknown>[]

    const margins = db.prepare(`
      SELECT sku, name, category, sell_price, buy_price,
             (sell_price - buy_price) as margin,
             CASE WHEN sell_price > 0 THEN ROUND((sell_price - buy_price) * 100.0 / sell_price, 1) ELSE NULL END as margin_pct
      FROM products WHERE sell_price > 0 ORDER BY margin_pct DESC
    `).all() as Record<string, unknown>[]

    const sections: string[] = []
    sections.push(BOM + `=== 銷售報表摘要 (最近 ${days} 天) ===\r\n生成時間：${new Date().toLocaleString('zh-TW')}`)
    sections.push('')
    sections.push(`=== 熱銷商品 TOP 20 (${dateFrom} ~ ${new Date().toISOString().slice(0, 10)}) ===`)
    sections.push(toCsv(['SKU', '商品名稱', '類別', '銷售數量', '銷售金額'],
      topProducts.map(r => [r.sku, r.name, r.category, r.total_qty, r.total_revenue])).replace(BOM, ''))
    sections.push('')
    sections.push(`=== 低庫存警示 (${lowStock.length} 項) ===`)
    sections.push(toCsv(['SKU', '商品名稱', '類別', '現有庫存', '補貨點', '缺口'],
      lowStock.map(r => [r.sku, r.name, r.category, r.stock_qty, r.reorder_pt, r.gap])).replace(BOM, ''))
    sections.push('')
    sections.push('=== 毛利分析 ===')
    sections.push(toCsv(['SKU', '商品名稱', '類別', '售價', '進價', '毛利', '毛利率(%)'],
      margins.map(r => [r.sku, r.name, r.category, r.sell_price, r.buy_price, r.margin, r.margin_pct])).replace(BOM, ''))

    writeFileSync(filePath, sections.join('\r\n'), 'utf-8')
    return { success: true, filePath }
  })
}
