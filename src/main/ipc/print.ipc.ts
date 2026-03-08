import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import { getDb } from '../db'

interface OrderRow {
  id: number
  order_no: string
  order_date: string
  total_amount: number
  notes: string | null
  supplier_name?: string
  customer_name?: string
  status: string
}

interface ItemRow {
  product_name: string
  sku: string
  unit: string
  quantity: number
  unit_price: number
}

function formatCurrency(n: number) {
  return 'NT$ ' + n.toLocaleString('zh-TW')
}

function buildHtml(type: 'sales' | 'purchase', order: OrderRow, items: ItemRow[]): string {
  const title = type === 'purchase' ? '採購單' : '銷售單'
  const partyLabel = type === 'purchase' ? '供應商' : '客戶'
  const partyName = (type === 'purchase' ? order.supplier_name : order.customer_name) ?? '-'
  const rows = items
    .map(
      (i) =>
        `<tr>
          <td>${i.product_name}</td>
          <td>${i.sku}</td>
          <td style="text-align:right">${i.quantity}</td>
          <td>${i.unit}</td>
          <td style="text-align:right">${formatCurrency(i.unit_price)}</td>
          <td style="text-align:right">${formatCurrency(i.quantity * i.unit_price)}</td>
        </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; margin: 40px; color: #1a1a1a; font-size: 13px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .subtitle { color: #555; font-size: 13px; margin-bottom: 24px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 24px; font-size: 13px; }
  .meta-grid span { color: #666; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { background: #f0f0f0; padding: 7px 10px; text-align: left; border-bottom: 2px solid #ccc; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #eee; }
  .total-row { text-align: right; font-size: 15px; font-weight: bold; margin-top: 16px; padding-top: 8px; border-top: 2px solid #ccc; }
  .notes { margin-top: 16px; color: #666; font-size: 12px; }
  .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
</style>
</head>
<body>
  <h1>SkillCraft IMS</h1>
  <div class="subtitle">${title} ${order.order_no}</div>
  <div class="meta-grid">
    <div><span>${partyLabel}：</span>${partyName}</div>
    <div><span>訂單日期：</span>${order.order_date}</div>
    <div><span>狀態：</span>${order.status === 'completed' ? '已完成' : order.status === 'received' ? '已收貨' : order.status === 'cancelled' ? '已取消' : '待處理'}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>商品名稱</th><th>SKU</th>
        <th style="text-align:right">數量</th><th>單位</th>
        <th style="text-align:right">單價</th><th style="text-align:right">小計</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total-row">合計：${formatCurrency(order.total_amount)}</div>
  ${order.notes ? `<div class="notes">備註：${order.notes}</div>` : ''}
  <div class="footer">由 SkillCraft IMS 產生 · ${new Date().toLocaleString('zh-TW')}</div>
</body>
</html>`
}

export function registerPrintIpc(): void {
  ipcMain.handle('print:pdf', async (_e, { type, id }: { type: 'sales' | 'purchase'; id: number }) => {
    const db = getDb()

    let order: OrderRow | undefined
    let items: ItemRow[] = []

    if (type === 'purchase') {
      order = db.prepare(`
        SELECT po.*, s.name as supplier_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.id = ?
      `).get(id) as OrderRow | undefined
      items = db.prepare(`
        SELECT p.name as product_name, p.sku, p.unit, pi.quantity, pi.unit_price
        FROM purchase_items pi
        JOIN products p ON pi.product_id = p.id
        WHERE pi.purchase_order_id = ?
        ORDER BY p.name
      `).all(id) as ItemRow[]
    } else {
      order = db.prepare(`
        SELECT so.*, c.name as customer_name
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE so.id = ?
      `).get(id) as OrderRow | undefined
      items = db.prepare(`
        SELECT p.name as product_name, p.sku, p.unit, si.quantity, si.unit_price
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        WHERE si.sales_order_id = ?
        ORDER BY p.name
      `).all(id) as ItemRow[]
    }

    if (!order) throw new Error('找不到訂單')

    const html = buildHtml(type, order, items)

    const win = new BrowserWindow({ width: 800, height: 1100, show: false, webPreferences: { nodeIntegration: false } })
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))

    const pdfBuffer = await win.webContents.printToPDF({ marginsType: 1, pageSize: 'A4' })
    win.close()

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '儲存 PDF',
      defaultPath: order.order_no + '.pdf',
      filters: [{ name: 'PDF 檔案', extensions: ['pdf'] }]
    })

    if (canceled || !filePath) return { success: false }

    writeFileSync(filePath, pdfBuffer)
    return { success: true, filePath }
  })
}
