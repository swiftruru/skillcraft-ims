import { google, sheets_v4 } from 'googleapis'
import type { Product, PurchaseOrder, SalesOrder } from '../db/schema'

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null
  private spreadsheetId: string = ''

  async initialize(keyFilePath: string, spreadsheetId: string): Promise<void> {
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })
    this.sheets = google.sheets({ version: 'v4', auth })
    this.spreadsheetId = spreadsheetId
  }

  isInitialized(): boolean {
    return this.sheets !== null && this.spreadsheetId !== ''
  }

  async testConnection(): Promise<void> {
    if (!this.sheets) throw new Error('Google Sheets 未初始化，請先在設定頁面設定 credentials')
    await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId })
  }

  async initSheetStructure(): Promise<void> {
    if (!this.sheets) throw new Error('未初始化')

    const spreadsheet = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId
    })
    const existingSheets = spreadsheet.data.sheets?.map((s) => s.properties?.title) ?? []

    const requiredSheets = ['Products', 'Purchase Orders', 'Sales Orders', 'Reports']
    const toCreate = requiredSheets.filter((s) => !existingSheets.includes(s))

    if (toCreate.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: toCreate.map((title) => ({
            addSheet: { properties: { title } }
          }))
        }
      })
    }

    // Set headers
    const headers: Record<string, string[][]> = {
      Products: [['SKU', '商品名稱', '類別', '售價', '進價', '庫存', '補貨點', '單位', '說明', '更新時間']],
      'Purchase Orders': [['訂單號', '供應商', '狀態', '訂單日期', '收貨日期', '金額', '備註']],
      'Sales Orders': [['訂單號', '客戶', '狀態', '訂單日期', '金額', '備註']],
      Reports: [['日期', '庫存總值', '低庫存商品數', '本月營收', '本月毛利']]
    }

    for (const [sheet, headerRow] of Object.entries(headers)) {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheet}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: headerRow }
      })
    }
  }

  async pushProducts(products: Product[]): Promise<void> {
    if (!this.sheets) throw new Error('未初始化')
    const values = products.map((p) => [
      p.sku, p.name, p.category, p.sell_price, p.buy_price,
      p.stock_qty, p.reorder_pt, p.unit, p.description ?? '', p.updated_at
    ])
    await this.clearAndWrite('Products!A2', values)
  }

  async pullProducts(): Promise<Partial<Product>[]> {
    if (!this.sheets) throw new Error('未初始化')
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Products!A2:J'
    })
    return (response.data.values ?? [])
      .filter((row) => row[0]) // skip empty rows
      .map((row) => ({
        sku: String(row[0] ?? ''),
        name: String(row[1] ?? ''),
        category: String(row[2] ?? '未分類'),
        sell_price: parseFloat(row[3]) || 0,
        buy_price: parseFloat(row[4]) || 0,
        stock_qty: parseInt(row[5]) || 0,
        reorder_pt: parseInt(row[6]) || 10,
        unit: String(row[7] ?? '個'),
        description: row[8] ? String(row[8]) : null,
        updated_at: String(row[9] ?? new Date().toISOString())
      }))
  }

  async pushPurchaseOrders(orders: PurchaseOrder[]): Promise<void> {
    if (!this.sheets) throw new Error('未初始化')
    const values = orders.map((o) => [
      o.order_no, o.supplier_name ?? '', o.status,
      o.order_date, o.receive_date ?? '', o.total_amount, o.notes ?? ''
    ])
    await this.clearAndWrite('Purchase Orders!A2', values)
  }

  async pushSalesOrders(orders: SalesOrder[]): Promise<void> {
    if (!this.sheets) throw new Error('未初始化')
    const values = orders.map((o) => [
      o.order_no, o.customer_name ?? '', o.status,
      o.order_date, o.total_amount, o.notes ?? ''
    ])
    await this.clearAndWrite('Sales Orders!A2', values)
  }

  async pushDailyReport(report: {
    date: string
    inventoryValue: number
    lowStockCount: number
    monthlyRevenue: number
    monthlyGrossProfit: number
  }): Promise<void> {
    if (!this.sheets) throw new Error('未初始化')
    // Append to Reports sheet
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Reports!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          report.date, report.inventoryValue, report.lowStockCount,
          report.monthlyRevenue, report.monthlyGrossProfit
        ]]
      }
    })
  }

  private async clearAndWrite(range: string, values: unknown[][]): Promise<void> {
    if (!this.sheets) return
    if (values.length === 0) return

    // Clear existing data first
    const sheetName = range.split('!')[0]
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A2:Z`
    })

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    })
  }
}
