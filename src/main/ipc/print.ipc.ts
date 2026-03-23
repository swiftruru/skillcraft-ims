import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import QRCode from 'qrcode'
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
  payment_status?: string
  payment_due_date?: string | null
}

interface ItemRow {
  product_name: string
  sku: string
  unit: string
  quantity: number
  unit_price: number
}

interface CompanyInfo {
  name: string
  address: string
  phone: string
}

function formatCurrency(n: number) {
  return 'NT$ ' + n.toLocaleString('zh-TW')
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: '已完成',
    received: '已收貨',
    cancelled: '已取消',
    pending: '待處理',
    returned: '已退貨',
    partial_return: '部分退貨'
  }
  return map[status] ?? status
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    completed: 'background:#dcfce7;color:#15803d',
    received: 'background:#dbeafe;color:#1d4ed8',
    cancelled: 'background:#fee2e2;color:#b91c1c',
    pending: 'background:#fef9c3;color:#a16207',
    returned: 'background:#ffedd5;color:#c2410c',
    partial_return: 'background:#fef3c7;color:#b45309'
  }
  return map[status] ?? 'background:#f3f4f6;color:#374151'
}

function buildHtml(
  type: 'sales' | 'purchase',
  order: OrderRow,
  items: ItemRow[],
  company: CompanyInfo
): string {
  const title = type === 'purchase' ? '採購單' : '銷售單'
  const partyLabel = type === 'purchase' ? '供應商' : '客戶'
  const partyName = (type === 'purchase' ? order.supplier_name : order.customer_name) ?? '-'

  const rows = items
    .map(
      (item, idx) => `
      <tr style="${idx % 2 === 1 ? 'background:#f9fafb' : ''}">
        <td style="padding:9px 12px">${item.product_name}</td>
        <td style="padding:9px 12px;color:#6b7280;font-family:monospace;font-size:12px">${item.sku}</td>
        <td style="padding:9px 12px;text-align:center">${item.quantity} ${item.unit}</td>
        <td style="padding:9px 12px;text-align:right">${formatCurrency(item.unit_price)}</td>
        <td style="padding:9px 12px;text-align:right;font-weight:600">${formatCurrency(item.quantity * item.unit_price)}</td>
      </tr>`
    )
    .join('')

  const companyBlock = company.name
    ? `<div style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:4px">${company.name}</div>
       ${company.address ? `<div style="font-size:12px;color:#64748b;margin-bottom:2px">${company.address}</div>` : ''}
       ${company.phone ? `<div style="font-size:12px;color:#64748b">電話：${company.phone}</div>` : ''}`
    : `<div style="font-size:20px;font-weight:700;color:#1e293b">SkillCraft IMS</div>`

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', sans-serif;
    color: #1e293b;
    font-size: 13px;
    background: #fff;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div style="padding:40px 48px;max-width:800px;margin:0 auto">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:3px solid #4f46e5;margin-bottom:28px">
    <div>${companyBlock}</div>
    <div style="text-align:right">
      <div style="font-size:24px;font-weight:800;color:#4f46e5;letter-spacing:-0.5px">${title}</div>
      <div style="font-size:13px;font-family:monospace;color:#475569;margin-top:4px">${order.order_no}</div>
      <div style="margin-top:8px;display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;${getStatusColor(order.status)}">${getStatusLabel(order.status)}</div>
    </div>
  </div>

  <!-- Meta info -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 32px;margin-bottom:28px;padding:16px 20px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
    <div>
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">${partyLabel}</div>
      <div style="font-weight:600;font-size:14px">${partyName}</div>
    </div>
    <div>
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">訂單日期</div>
      <div style="font-weight:600;font-size:14px">${order.order_date}</div>
    </div>
    <div>
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">列印日期</div>
      <div style="font-size:13px">${new Date().toLocaleDateString('zh-TW')}</div>
    </div>
    <div>
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">品項數量</div>
      <div style="font-size:13px">${items.length} 項</div>
    </div>
    ${type === 'sales' && order.payment_status ? `
    <div>
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">付款狀態</div>
      <div style="font-size:13px;font-weight:600;color:${order.payment_status === 'paid' ? '#15803d' : '#dc2626'}">${order.payment_status === 'paid' ? '已付款' : '未付款'}</div>
    </div>
    ${order.payment_due_date ? `
    <div>
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">付款期限</div>
      <div style="font-size:13px;font-weight:600;color:${order.payment_due_date < new Date().toISOString().slice(0,10) && order.payment_status !== 'paid' ? '#dc2626' : '#1e293b'}">${order.payment_due_date}</div>
    </div>` : ''}` : ''}
  </div>

  <!-- Table -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <thead>
      <tr style="background:#4f46e5">
        <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;border-radius:6px 0 0 0">商品名稱</th>
        <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600">SKU</th>
        <th style="padding:10px 12px;text-align:center;color:#fff;font-size:12px;font-weight:600">數量</th>
        <th style="padding:10px 12px;text-align:right;color:#fff;font-size:12px;font-weight:600">單價</th>
        <th style="padding:10px 12px;text-align:right;color:#fff;font-size:12px;font-weight:600;border-radius:0 6px 0 0">小計</th>
      </tr>
    </thead>
    <tbody style="border:1px solid #e2e8f0;border-top:none">
      ${rows}
    </tbody>
  </table>

  <!-- Total -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
    <div style="min-width:220px">
      <div style="display:flex;justify-content:space-between;padding:8px 12px;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0">
        <span>小計</span>
        <span>${formatCurrency(order.total_amount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 12px;background:#4f46e5;color:#fff;font-size:15px;font-weight:700;border-radius:0 0 6px 6px">
        <span>合計</span>
        <span>${formatCurrency(order.total_amount)}</span>
      </div>
    </div>
  </div>

  ${order.notes ? `
  <!-- Notes -->
  <div style="padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;margin-bottom:32px">
    <div style="font-size:11px;color:#92400e;font-weight:600;margin-bottom:4px">備註</div>
    <div style="font-size:13px;color:#78350f">${order.notes}</div>
  </div>` : ''}

  <!-- Signature -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-bottom:32px">
    ${['製單人', '審核', '收貨確認'].map(label => `
    <div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:24px">${label}</div>
      <div style="border-bottom:1px solid #cbd5e1;height:1px"></div>
    </div>`).join('')}
  </div>

  <!-- Footer -->
  <div style="text-align:center;font-size:11px;color:#94a3b8;padding-top:16px;border-top:1px solid #f1f5f9">
    由 SkillCraft IMS 產生 · ${new Date().toLocaleString('zh-TW')}
  </div>

</div>
</body>
</html>`
}


function buildMonthlyReportHtml(
  year: number,
  month: number,
  db: import('better-sqlite3').Database
): string {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`

  // KPI
  const revenue = (db.prepare(
    `SELECT COALESCE(SUM(total_amount),0) as v FROM sales_orders WHERE status='completed' AND strftime('%Y-%m',order_date)=?`
  ).get(monthStr) as { v: number }).v
  const grossProfit = (db.prepare(
    `SELECT COALESCE(SUM((si.unit_price-p.buy_price)*si.quantity),0) as v
     FROM sale_items si JOIN products p ON si.product_id=p.id JOIN sales_orders so ON si.sales_order_id=so.id
     WHERE so.status='completed' AND strftime('%Y-%m',so.order_date)=?`
  ).get(monthStr) as { v: number }).v
  const marginPct = revenue > 0 ? Math.round(grossProfit / revenue * 100) : 0
  const lowStockCount = (db.prepare(
    `SELECT COUNT(*) as v FROM products WHERE stock_qty<=reorder_pt`
  ).get() as { v: number }).v

  // Top 5 products
  const topProducts = db.prepare(
    `SELECT p.name, SUM(si.quantity) as qty, ROUND(SUM(si.quantity*si.unit_price),0) as rev
     FROM sale_items si JOIN products p ON si.product_id=p.id JOIN sales_orders so ON si.sales_order_id=so.id
     WHERE so.status='completed' AND strftime('%Y-%m',so.order_date)=?
     GROUP BY p.id ORDER BY rev DESC LIMIT 5`
  ).all(monthStr) as { name: string; qty: number; rev: number }[]

  // Top 5 customers
  const topCustomers = db.prepare(
    `SELECT c.name, COUNT(*) as cnt, SUM(so.total_amount) as total
     FROM sales_orders so JOIN customers c ON so.customer_id=c.id
     WHERE so.status='completed' AND strftime('%Y-%m',so.order_date)=?
     GROUP BY c.id ORDER BY total DESC LIMIT 5`
  ).all(monthStr) as { name: string; cnt: number; total: number }[]

  // Low stock items
  const lowStockItems = db.prepare(
    `SELECT name, sku, stock_qty, reorder_pt FROM products WHERE stock_qty<=reorder_pt ORDER BY stock_qty ASC LIMIT 10`
  ).all() as { name: string; sku: string; stock_qty: number; reorder_pt: number }[]

  const topProductRows = topProducts.map((p, i) =>
    `<tr style="${i%2===1?'background:#f9fafb':''}">
      <td style="padding:8px 12px">${i+1}</td>
      <td style="padding:8px 12px;font-weight:600">${p.name}</td>
      <td style="padding:8px 12px;text-align:right">${p.qty}</td>
      <td style="padding:8px 12px;text-align:right;font-weight:600;color:#4f46e5">${formatCurrency(p.rev)}</td>
    </tr>`
  ).join('')

  const topCustomerRows = topCustomers.map((c, i) =>
    `<tr style="${i%2===1?'background:#f9fafb':''}">
      <td style="padding:8px 12px">${i+1}</td>
      <td style="padding:8px 12px;font-weight:600">${c.name}</td>
      <td style="padding:8px 12px;text-align:right">${c.cnt}</td>
      <td style="padding:8px 12px;text-align:right;font-weight:600;color:#16a34a">${formatCurrency(c.total)}</td>
    </tr>`
  ).join('')

  const lowStockRows = lowStockItems.map((item) =>
    `<tr>
      <td style="padding:8px 12px">${item.name}</td>
      <td style="padding:8px 12px;font-family:monospace;font-size:11px;color:#6b7280">${item.sku}</td>
      <td style="padding:8px 12px;text-align:right;font-weight:600;color:${item.stock_qty===0?'#dc2626':'#d97706'}">${item.stock_qty}</td>
      <td style="padding:8px 12px;text-align:right;color:#6b7280">${item.reorder_pt}</td>
    </tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Microsoft JhengHei','PingFang TC','Noto Sans TC',sans-serif; color: #1e293b; font-size: 13px; background: #fff; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div style="padding:40px 48px;max-width:800px;margin:0 auto">

  <!-- Title -->
  <div style="text-align:center;padding-bottom:24px;border-bottom:3px solid #4f46e5;margin-bottom:32px">
    <div style="font-size:28px;font-weight:800;color:#4f46e5">月報 ${year} 年 ${month} 月</div>
    <div style="font-size:12px;color:#94a3b8;margin-top:6px">產生時間：${new Date().toLocaleString('zh-TW')}</div>
  </div>

  <!-- KPI Cards -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-bottom:32px">
    ${[
      { label: '本月營收', value: formatCurrency(revenue), color: '#4f46e5' },
      { label: '毛利', value: formatCurrency(grossProfit), color: '#16a34a' },
      { label: '毛利率', value: marginPct + '%', color: marginPct >= 30 ? '#16a34a' : marginPct >= 10 ? '#d97706' : '#dc2626' },
      { label: '低庫存商品', value: lowStockCount + ' 項', color: '#d97706' }
    ].map(k => `
    <div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;text-align:center">
      <div style="font-size:11px;color:#94a3b8;margin-bottom:6px">${k.label}</div>
      <div style="font-size:20px;font-weight:700;color:${k.color}">${k.value}</div>
    </div>`).join('')}
  </div>

  <!-- Top Products -->
  <div style="margin-bottom:28px">
    <div style="font-size:14px;font-weight:700;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #e2e8f0">前 5 名商品</div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#4f46e5">
        <th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">#</th>
        <th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">商品</th>
        <th style="padding:8px 12px;text-align:right;color:#fff;font-size:12px">銷售數量</th>
        <th style="padding:8px 12px;text-align:right;color:#fff;font-size:12px">銷售金額</th>
      </tr></thead>
      <tbody style="border:1px solid #e2e8f0;border-top:none">${topProductRows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#94a3b8">本月無銷售記錄</td></tr>'}</tbody>
    </table>
  </div>

  <!-- Top Customers -->
  <div style="margin-bottom:28px">
    <div style="font-size:14px;font-weight:700;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #e2e8f0">前 5 名客戶</div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#16a34a">
        <th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">#</th>
        <th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">客戶</th>
        <th style="padding:8px 12px;text-align:right;color:#fff;font-size:12px">訂單數</th>
        <th style="padding:8px 12px;text-align:right;color:#fff;font-size:12px">消費金額</th>
      </tr></thead>
      <tbody style="border:1px solid #e2e8f0;border-top:none">${topCustomerRows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#94a3b8">本月無客戶訂單</td></tr>'}</tbody>
    </table>
  </div>

  <!-- Low Stock -->
  <div>
    <div style="font-size:14px;font-weight:700;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #e2e8f0">低庫存清單（${lowStockItems.length} 項）</div>
    ${lowStockItems.length > 0 ? `
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#d97706">
        <th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">商品名稱</th>
        <th style="padding:8px 12px;text-align:left;color:#fff;font-size:12px">SKU</th>
        <th style="padding:8px 12px;text-align:right;color:#fff;font-size:12px">現有庫存</th>
        <th style="padding:8px 12px;text-align:right;color:#fff;font-size:12px">補貨點</th>
      </tr></thead>
      <tbody style="border:1px solid #e2e8f0;border-top:none">${lowStockRows}</tbody>
    </table>` : '<div style="padding:12px;color:#94a3b8;text-align:center">目前無低庫存商品</div>'}
  </div>

  <!-- Footer -->
  <div style="text-align:center;font-size:11px;color:#94a3b8;padding-top:24px;margin-top:32px;border-top:1px solid #f1f5f9">
    由 SkillCraft IMS 自動產生 · ${new Date().toLocaleString('zh-TW')}
  </div>

</div>
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

    // 讀取公司資訊
    const settingRows = db
      .prepare('SELECT key, value FROM app_settings WHERE key IN (?, ?, ?)')
      .all('companyName', 'companyAddress', 'companyPhone') as { key: string; value: string }[]
    const s: Record<string, string> = {}
    for (const row of settingRows) s[row.key] = row.value
    const company: CompanyInfo = {
      name: s['companyName'] ?? '',
      address: s['companyAddress'] ?? '',
      phone: s['companyPhone'] ?? ''
    }

    const html = buildHtml(type, order, items, company)

    const win = new BrowserWindow({
      width: 900,
      height: 1200,
      show: false,
      webPreferences: { nodeIntegration: false }
    })
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    await new Promise((resolve) => setTimeout(resolve, 300))

    const pdfBuffer = await win.webContents.printToPDF({
      margins: { marginType: 'printableArea' },
      pageSize: 'A4'
    })
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

  ipcMain.handle('reports:exportMonthlyPdf', async (_e, { year, month }: { year: number; month: number }) => {
    const db = getDb()
    const html = buildMonthlyReportHtml(year, month, db)

    const win = new BrowserWindow({ width: 900, height: 1200, show: false, webPreferences: { nodeIntegration: false } })
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    await new Promise((resolve) => setTimeout(resolve, 400))

    const pdfBuffer = await win.webContents.printToPDF({ margins: { marginType: 'printableArea' }, pageSize: 'A4' })
    win.close()

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '儲存月報 PDF',
      defaultPath: `monthly-report-${year}-${String(month).padStart(2, '0')}.pdf`,
      filters: [{ name: 'PDF 檔案', extensions: ['pdf'] }]
    })

    if (canceled || !filePath) return { success: false }
    writeFileSync(filePath, pdfBuffer)
    return { success: true, filePath }
  })

  // ── Product Label PDF ─────────────────────────────────────────────────────
  ipcMain.handle(
    'print:labels',
    async (_e, opts: { productIds: number[]; showPrice?: boolean }) => {
      const db = getDb()
      const products = opts.productIds
        .map((id) =>
          db
            .prepare(`SELECT sku, name, sell_price FROM products WHERE id = ?`)
            .get(id)
        )
        .filter(Boolean) as { sku: string; name: string; sell_price: number }[]

      if (products.length === 0) return { success: false }

      const labelItems = await Promise.all(
        products.map(async (p) => {
          const qrSvg = await QRCode.toString(p.sku, {
            type: 'svg',
            margin: 0,
            width: 88,
            color: { dark: '#000000', light: '#FFFFFF' }
          })
          const priceHtml =
            opts.showPrice !== false
              ? `<div class="price">NT$ ${Number(p.sell_price).toLocaleString()}</div>`
              : ''
          const nameShort = p.name.length > 14 ? p.name.slice(0, 13) + '\u2026' : p.name
          return `<div class="label">
            <div class="qr">${qrSvg}</div>
            <div class="info">
              <div class="name">${nameShort}</div>
              <div class="sku">${p.sku}</div>
              ${priceHtml}
            </div>
          </div>`
        })
      )

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif; }
  .page { display: grid; grid-template-columns: repeat(4, 47.5mm); gap: 3mm; padding: 8mm; }
  .label {
    width: 47.5mm; height: 30mm; border: 0.5pt solid #999; border-radius: 2pt;
    display: flex; align-items: center; padding: 2mm; gap: 2mm;
    page-break-inside: avoid; overflow: hidden;
  }
  .qr { width: 24mm; min-width: 24mm; }
  .qr svg { width: 100%; height: auto; display: block; }
  .info { flex: 1; overflow: hidden; }
  .name  { font-size: 7.5pt; font-weight: bold; line-height: 1.2; margin-bottom: 1.5mm; word-break: break-all; }
  .sku   { font-size: 6.5pt; color: #555; margin-bottom: 1mm; }
  .price { font-size: 8pt; font-weight: bold; color: #1d4ed8; }
  @media print { @page { size: A4; margin: 0; } }
</style></head>
<body><div class="page">${labelItems.join('')}</div></body></html>`

      const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      await new Promise<void>((r) => setTimeout(r, 400))

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '儲存商品標籤 PDF',
        defaultPath: `product-labels-${new Date().toISOString().slice(0, 10)}.pdf`,
        filters: [{ name: 'PDF 檔案', extensions: ['pdf'] }]
      })

      if (canceled || !filePath) {
        win.destroy()
        return { success: false }
      }

      const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
      win.destroy()
      writeFileSync(filePath, pdf)
      return { success: true, filePath }
    }
  )
}
