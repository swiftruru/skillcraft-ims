import { getDb } from '../db'
import { GoogleSheetsService } from './googleSheets.service'
import { ProductModel } from '../db/models/product.model'
import { PurchaseModel } from '../db/models/purchase.model'
import { SaleModel } from '../db/models/sale.model'
import { getMainWindow } from '../index'

export class SyncService {
  private static instance: SyncService
  private sheetsService = new GoogleSheetsService()
  private initialized = false

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  async initialize(): Promise<void> {
    const db = getDb()
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as {
      key: string
      value: string
    }[]
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = r.value

    const sheetId = settings['googleSheetId']
    const keyPath = settings['serviceAccountKeyPath']

    if (sheetId && keyPath) {
      await this.sheetsService.initialize(keyPath, sheetId)
      this.initialized = true
    }
  }

  async testConnection(): Promise<void> {
    await this.initialize()
    await this.sheetsService.testConnection()
  }

  async initSheetStructure(): Promise<void> {
    await this.initialize()
    await this.sheetsService.initSheetStructure()
  }

  async sync(direction: 'push' | 'pull' | 'bidirectional'): Promise<{ recordsSynced: number }> {
    const db = getDb()
    await this.initialize()

    if (!this.initialized || !this.sheetsService.isInitialized()) {
      throw new Error('Google Sheets 尚未設定，請先在「設定」頁面填入 Sheet ID 和 Service Account Key。')
    }

    const logId = (
      db
        .prepare(
          `INSERT INTO sync_log (direction, status, message) VALUES (?, 'running', '同步中...')`
        )
        .run(direction).lastInsertRowid as number
    )

    const emitProgress = (msg: string) => {
      getMainWindow()?.webContents.send('sync:progress', { message: msg })
    }

    try {
      let recordsSynced = 0

      if (direction === 'push' || direction === 'bidirectional') {
        emitProgress('推送商品資料...')
        const products = ProductModel.findAll()
        await this.sheetsService.pushProducts(products)
        recordsSynced += products.length

        emitProgress('推送採購訂單...')
        const purchases = PurchaseModel.findAll()
        await this.sheetsService.pushPurchaseOrders(purchases)
        recordsSynced += purchases.length

        emitProgress('推送銷售訂單...')
        const sales = SaleModel.findAll()
        await this.sheetsService.pushSalesOrders(sales)
        recordsSynced += sales.length

        emitProgress('推送每日報表...')
        const kpiRow = db
          .prepare(
            `SELECT
              COALESCE(SUM(stock_qty * buy_price),0) as inventoryValue,
              (SELECT COUNT(*) FROM products WHERE stock_qty <= reorder_pt) as lowStockCount,
              (SELECT COALESCE(SUM(total_amount),0) FROM sales_orders WHERE status='completed' AND strftime('%Y-%m',order_date)=strftime('%Y-%m','now')) as monthlyRevenue,
              (SELECT COALESCE(SUM((si.unit_price-p.buy_price)*si.quantity),0) FROM sale_items si JOIN products p ON si.product_id=p.id JOIN sales_orders so ON si.sales_order_id=so.id WHERE so.status='completed' AND strftime('%Y-%m',so.order_date)=strftime('%Y-%m','now')) as monthlyGrossProfit
            FROM products`
          )
          .get() as {
          inventoryValue: number
          lowStockCount: number
          monthlyRevenue: number
          monthlyGrossProfit: number
        }
        await this.sheetsService.pushDailyReport({
          date: new Date().toISOString().split('T')[0],
          ...kpiRow
        })
      }

      if (direction === 'pull' || direction === 'bidirectional') {
        emitProgress('從 Sheets 拉取商品資料...')
        const remoteProducts = await this.sheetsService.pullProducts()

        const upsert = db.prepare(
          `INSERT INTO products (sku, name, category, sell_price, buy_price, stock_qty, reorder_pt, unit, description, updated_at)
           VALUES (@sku, @name, @category, @sell_price, @buy_price, @stock_qty, @reorder_pt, @unit, @description, @updated_at)
           ON CONFLICT(sku) DO UPDATE SET
             name = CASE WHEN excluded.updated_at > products.updated_at THEN excluded.name ELSE products.name END,
             category = CASE WHEN excluded.updated_at > products.updated_at THEN excluded.category ELSE products.category END,
             sell_price = CASE WHEN excluded.updated_at > products.updated_at THEN excluded.sell_price ELSE products.sell_price END,
             buy_price = CASE WHEN excluded.updated_at > products.updated_at THEN excluded.buy_price ELSE products.buy_price END,
             stock_qty = CASE WHEN excluded.updated_at > products.updated_at THEN excluded.stock_qty ELSE products.stock_qty END,
             reorder_pt = CASE WHEN excluded.updated_at > products.updated_at THEN excluded.reorder_pt ELSE products.reorder_pt END,
             unit = CASE WHEN excluded.updated_at > products.updated_at THEN excluded.unit ELSE products.unit END,
             description = CASE WHEN excluded.updated_at > products.updated_at THEN excluded.description ELSE products.description END,
             updated_at = CASE WHEN excluded.updated_at > products.updated_at THEN excluded.updated_at ELSE products.updated_at END`
        )

        db.transaction(() => {
          for (const p of remoteProducts) {
            if (p.sku) upsert.run(p)
          }
        })()

        recordsSynced += remoteProducts.length
      }

      db.prepare(
        `UPDATE sync_log SET status='success', message=?, records_synced=? WHERE id=?`
      ).run(`同步完成，共處理 ${recordsSynced} 筆記錄`, recordsSynced, logId)

      emitProgress(`同步完成！共處理 ${recordsSynced} 筆記錄`)
      getMainWindow()?.webContents.send('sync:completed', { recordsSynced })

      return { recordsSynced }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      db.prepare(`UPDATE sync_log SET status='error', message=? WHERE id=?`).run(msg, logId)
      getMainWindow()?.webContents.send('sync:error', { error: msg })
      throw err
    }
  }
}
