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
    pending: '待處理'
  }
  return map[status] ?? status
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    completed: 'background:#dcfce7;color:#15803d',
    received: 'background:#dbeafe;color:#1d4ed8',
    cancelled: 'background:#fee2e2;color:#b91c1c',
    pending: 'background:#fef9c3;color:#a16207'
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
}
