import { ipcMain } from 'electron'
import { getDb } from '../db/index'

interface MockDataOptions {
  scale: 'S' | 'M' | 'L'
  scenario: 'normal' | 'warning' | 'empty'
}

interface MockDataResult {
  success: boolean
  counts: {
    suppliers: number
    customers: number
    products: number
    purchaseOrders: number
    salesOrders: number
    adjustments: number
    stockTakes: number
  }
  error?: string
}

// ─── 靜態資料池 ────────────────────────────────────────────────

const SUPPLIERS = [
  { name: '台灣電子供應商', contact: '王志明', phone: '02-2345-6789', email: 'sales@tw-elec.com.tw', address: '台北市中山區南京東路三段 100 號', notes: '主要電子零件供應商' },
  { name: '鴻鑫科技', contact: '林佳穎', phone: '03-456-7890', email: 'contact@hx-tech.com.tw', address: '新竹市科學園區工業東七路 20 號', notes: '新竹科學園區廠商，品質穩定' },
  { name: '捷騰資訊', contact: '陳建宏', phone: '02-8765-4321', email: 'buy@jt-info.com.tw', address: '新北市板橋區文化路二段 88 號', notes: '電腦周邊主要進貨商' },
  { name: '大統辦公用品', contact: '張美玲', phone: '04-2345-6789', email: 'order@dahtong.com.tw', address: '台中市西區民生路 45 號', notes: '辦公用品批發，量大優惠' },
  { name: '永豐包裝材料', contact: '黃俊賢', phone: '06-234-5678', email: 'pkg@yf-pack.com.tw', address: '台南市工業區工業路 30 號', notes: '各式包裝材料，可客製化' },
  { name: '聯發文具行', contact: '吳雅婷', phone: '02-2234-5678', email: 'lienfar@stationery.tw', address: '台北市大安區忠孝東路四段 200 號', notes: '文具批發，每月固定採購' },
  { name: '星海電腦', contact: '蔡宏偉', phone: '02-2789-0123', email: 'info@startech.com.tw', address: '台北市信義區松高路 22 號', notes: '高階電腦周邊指定廠商' },
  { name: '承恩五金', contact: '劉志強', phone: '07-345-6789', email: 'cheng-en@hardware.com.tw', address: '高雄市三民區十全一路 150 號', notes: '南部廠商，運費較高' },
]

const CUSTOMERS = [
  { name: '台積電採購部', contact: '趙偉昌', phone: '03-563-6688', email: 'purchase@tsmc.com', address: '新竹科學工業園區力行六路 8 號', notes: 'VIP 客戶，月結 60 天' },
  { name: '鴻海精密採購處', contact: '許志豪', phone: '02-2268-3898', email: 'foxconn.buy@foxconn.com', address: '新北市土城區自由街 2 號', notes: '大量採購，需提前備料' },
  { name: '遠傳電信', contact: '蕭淑珍', phone: '02-8729-0000', email: 'procurement@fetnet.net', address: '台北市大安區敦化南路二段 207 號', notes: '季度合約客戶' },
  { name: '統一超商', contact: '朱建國', phone: '02-2747-1234', email: 'supply@7-11.com.tw', address: '台北市松山區八德路四段 138 號', notes: '門市補給，每週固定單' },
  { name: '誠品文化', contact: '林詩婷', phone: '02-2775-5977', email: 'buy@eslite.com', address: '台北市信義區松高路 11 號', notes: '文具類主要客戶' },
  { name: '台灣大學總務處', contact: '廖文正', phone: '02-3366-2000', email: 'general@ntu.edu.tw', address: '台北市大安區羅斯福路四段 1 號', notes: '學術機構，採購程序較長' },
  { name: '中華電信', contact: '吳志明', phone: '02-2344-5678', email: 'cht.buy@cht.com.tw', address: '台北市中正區愛國西路 21 號', notes: '電信業採購' },
  { name: '玉山銀行', contact: '張麗華', phone: '02-2182-1313', email: 'facility@esunbank.com.tw', address: '台北市松山區民生東路三段 179 號', notes: '金融業客戶，辦公用品為主' },
  { name: '陳大明', contact: '陳大明', phone: '0912-345-678', email: 'daming.chen@gmail.com', address: '台北市大安區和平東路一段 100 號', notes: '個人客戶' },
  { name: '林小花', contact: '林小花', phone: '0928-765-432', email: 'xiaohua.lin@yahoo.com.tw', address: '新北市永和區中正路 200 號', notes: '個人客戶，常購文具' },
  { name: '王建志', contact: '王建志', phone: '0956-789-012', email: 'jz.wang@hotmail.com', address: '桃園市中壢區中山路 300 號', notes: '個人客戶' },
  { name: '李美慧', contact: '李美慧', phone: '0978-012-345', email: 'meihui.lee@gmail.com', address: '台中市西區台灣大道二段 500 號', notes: '個人客戶，3C 愛好者' },
]

interface ProductTemplate {
  name: string
  category: string
  buy: number
  sell: number
  unit: string
  reorder: number
}

const PRODUCT_POOL: ProductTemplate[] = [
  // 電子產品
  { name: 'USB-C 快充充電器 65W', category: '電子產品', buy: 280, sell: 490, unit: '個', reorder: 15 },
  { name: 'USB-A 充電器 18W', category: '電子產品', buy: 120, sell: 199, unit: '個', reorder: 20 },
  { name: '藍牙耳機 TWS Pro', category: '電子產品', buy: 680, sell: 1290, unit: '副', reorder: 10 },
  { name: '藍牙耳機 入門款', category: '電子產品', buy: 280, sell: 490, unit: '副', reorder: 15 },
  { name: '行動電源 20000mAh', category: '電子產品', buy: 520, sell: 890, unit: '個', reorder: 12 },
  { name: '行動電源 10000mAh', category: '電子產品', buy: 280, sell: 490, unit: '個', reorder: 15 },
  { name: '無線充電板 15W', category: '電子產品', buy: 320, sell: 560, unit: '個', reorder: 10 },
  { name: '多孔 USB 充電座 6埠', category: '電子產品', buy: 380, sell: 650, unit: '個', reorder: 8 },
  { name: 'Type-C to HDMI 轉接器', category: '電子產品', buy: 180, sell: 320, unit: '個', reorder: 12 },
  { name: 'USB Hub 7埠 3.0', category: '電子產品', buy: 420, sell: 720, unit: '個', reorder: 10 },
  { name: '藍牙喇叭 防水款', category: '電子產品', buy: 780, sell: 1390, unit: '個', reorder: 8 },
  { name: 'LED 護眼檯燈', category: '電子產品', buy: 480, sell: 850, unit: '個', reorder: 10 },
  { name: '智慧型插座 Wi-Fi款', category: '電子產品', buy: 320, sell: 560, unit: '個', reorder: 10 },
  { name: '門鈴攝影機 HD', category: '電子產品', buy: 1200, sell: 1990, unit: '組', reorder: 5 },
  { name: '網路無線延伸器 AC1200', category: '電子產品', buy: 580, sell: 990, unit: '個', reorder: 8 },
  { name: '電子書閱讀器 6吋', category: '電子產品', buy: 2800, sell: 4590, unit: '台', reorder: 5 },
  // 電腦周邊
  { name: '機械鍵盤 茶軸 TKL', category: '電腦周邊', buy: 1200, sell: 1990, unit: '個', reorder: 8 },
  { name: '機械鍵盤 紅軸 Full Size', category: '電腦周邊', buy: 1400, sell: 2290, unit: '個', reorder: 6 },
  { name: '無線靜音滑鼠', category: '電腦周邊', buy: 380, sell: 650, unit: '個', reorder: 15 },
  { name: '人體工學滑鼠', category: '電腦周邊', buy: 680, sell: 1190, unit: '個', reorder: 10 },
  { name: '27吋 IPS 螢幕 2K', category: '電腦周邊', buy: 5800, sell: 8990, unit: '台', reorder: 3 },
  { name: '24吋 FHD 螢幕', category: '電腦周邊', buy: 3200, sell: 4990, unit: '台', reorder: 5 },
  { name: '螢幕支架 雙螢幕', category: '電腦周邊', buy: 780, sell: 1290, unit: '組', reorder: 6 },
  { name: 'USB-C 擴充底座 10合1', category: '電腦周邊', buy: 1200, sell: 1990, unit: '個', reorder: 8 },
  { name: '網路攝影機 1080p', category: '電腦周邊', buy: 680, sell: 1190, unit: '個', reorder: 8 },
  { name: '電腦喇叭 2.0 桌上型', category: '電腦周邊', buy: 580, sell: 990, unit: '組', reorder: 8 },
  { name: '滑鼠墊 超大桌墊', category: '電腦周邊', buy: 180, sell: 320, unit: '個', reorder: 20 },
  { name: '筆電支架 鋁合金', category: '電腦周邊', buy: 380, sell: 650, unit: '個', reorder: 10 },
  { name: '機械鍵盤 青軸 Mini 60%', category: '電腦周邊', buy: 980, sell: 1590, unit: '個', reorder: 6 },
  // 文具
  { name: '中性筆 0.5mm 12支組', category: '文具', buy: 80, sell: 149, unit: '盒', reorder: 30 },
  { name: 'A4 影印紙 80g 500張', category: '文具', buy: 120, sell: 199, unit: '包', reorder: 50 },
  { name: '螢光筆 4色組', category: '文具', buy: 60, sell: 99, unit: '組', reorder: 30 },
  { name: '修正帶 5mm x 6m', category: '文具', buy: 40, sell: 65, unit: '個', reorder: 40 },
  { name: '雙面膠帶 18mm x 10m', category: '文具', buy: 25, sell: 45, unit: '個', reorder: 40 },
  { name: '透明膠帶 18mm 6入', category: '文具', buy: 55, sell: 89, unit: '組', reorder: 30 },
  { name: '筆記本 A5 方格 80頁', category: '文具', buy: 65, sell: 99, unit: '本', reorder: 30 },
  { name: '萬用手冊 B5', category: '文具', buy: 180, sell: 290, unit: '本', reorder: 15 },
  { name: '自黏便利貼 76x76mm 100張', category: '文具', buy: 35, sell: 59, unit: '本', reorder: 40 },
  { name: '迴紋針 100支裝', category: '文具', buy: 20, sell: 35, unit: '盒', reorder: 50 },
  { name: '長尾夾 19mm 12支', category: '文具', buy: 28, sell: 49, unit: '盒', reorder: 40 },
  { name: '剪刀 不鏽鋼 20cm', category: '文具', buy: 55, sell: 89, unit: '把', reorder: 20 },
  { name: '鋼珠筆 0.7mm 12支', category: '文具', buy: 95, sell: 159, unit: '盒', reorder: 25 },
  { name: 'A3 影印紙 80g 250張', category: '文具', buy: 180, sell: 290, unit: '包', reorder: 20 },
  // 包裝材料
  { name: '氣泡袋 20x30cm 50入', category: '包裝材料', buy: 120, sell: 199, unit: '包', reorder: 20 },
  { name: '氣泡袋 30x40cm 30入', category: '包裝材料', buy: 150, sell: 249, unit: '包', reorder: 15 },
  { name: '瓦楞紙箱 30x20x15cm 20入', category: '包裝材料', buy: 280, sell: 450, unit: '組', reorder: 10 },
  { name: '瓦楞紙箱 40x30x25cm 10入', category: '包裝材料', buy: 320, sell: 520, unit: '組', reorder: 10 },
  { name: '封箱膠帶 48mm x 100m', category: '包裝材料', buy: 45, sell: 75, unit: '捲', reorder: 30 },
  { name: '泡棉墊 50x50cm 10片', category: '包裝材料', buy: 180, sell: 299, unit: '包', reorder: 12 },
  { name: '牛皮紙袋 A4 50入', category: '包裝材料', buy: 95, sell: 159, unit: '包', reorder: 20 },
  { name: '束帶 150mm 100入', category: '包裝材料', buy: 35, sell: 59, unit: '包', reorder: 30 },
  { name: '氣柱袋 30x50cm 20入', category: '包裝材料', buy: 220, sell: 360, unit: '包', reorder: 10 },
  { name: '防靜電袋 20x30cm 50入', category: '包裝材料', buy: 160, sell: 260, unit: '包', reorder: 15 },
  // 辦公用品
  { name: '辦公椅 人體工學', category: '辦公用品', buy: 3800, sell: 5990, unit: '張', reorder: 3 },
  { name: '折疊椅 鋼管', category: '辦公用品', buy: 580, sell: 890, unit: '張', reorder: 5 },
  { name: '資料夾 A4 1.5吋', category: '辦公用品', buy: 45, sell: 75, unit: '個', reorder: 30 },
  { name: '資料夾 A4 3吋', category: '辦公用品', buy: 65, sell: 99, unit: '個', reorder: 20 },
  { name: '訂書機 10號', category: '辦公用品', buy: 120, sell: 199, unit: '個', reorder: 15 },
  { name: '訂書針 10號 1000支', category: '辦公用品', buy: 30, sell: 49, unit: '盒', reorder: 40 },
  { name: '白板筆 4色組', category: '辦公用品', buy: 85, sell: 139, unit: '組', reorder: 20 },
  { name: '磁性白板 60x90cm', category: '辦公用品', buy: 680, sell: 1090, unit: '塊', reorder: 5 },
  { name: '名片盒 透明壓克力', category: '辦公用品', buy: 65, sell: 99, unit: '個', reorder: 20 },
  { name: '計算機 12位數', category: '辦公用品', buy: 180, sell: 290, unit: '台', reorder: 10 },
  { name: '碎紙機 6張', category: '辦公用品', buy: 1200, sell: 1890, unit: '台', reorder: 3 },
  { name: '掃描器 A4 文件', category: '辦公用品', buy: 3500, sell: 5490, unit: '台', reorder: 2 },
  { name: '投影機 HD 3000流明', category: '辦公用品', buy: 8800, sell: 13800, unit: '台', reorder: 2 },
  { name: '電動升降桌 180x80cm', category: '辦公用品', buy: 8500, sell: 13500, unit: '張', reorder: 2 },
  { name: '書架 五層鋼製', category: '辦公用品', buy: 1200, sell: 1890, unit: '組', reorder: 3 },
  { name: '垃圾桶 腳踏式 15L', category: '辦公用品', buy: 180, sell: 290, unit: '個', reorder: 10 },
]

const SKU_PREFIX: Record<string, string> = {
  '電子產品': 'ELEC',
  '電腦周邊': 'PERI',
  '文具': 'STAT',
  '包裝材料': 'PKG',
  '辦公用品': 'OFFI',
}

const ADJUST_REASONS = ['盤點調整', '損耗', '進貨補正', '退貨入庫', '借出歸還', '樣品出貨']

// ─── 工具函式 ─────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** 近期偏重的隨機日期（quadratic bias toward recent） */
function randDate(daysBack: number): string {
  const u = Math.random()
  const days = Math.floor(Math.pow(u, 2) * daysBack)
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(8 + Math.floor(Math.random() * 10))
  d.setMinutes(Math.floor(Math.random() * 60))
  d.setSeconds(Math.floor(Math.random() * 60))
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

/** 在指定日期之後 N 天的 datetime 字串 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

/** 在指定日期之後 N 天的 YYYY-MM-DD 字串（用於 payment_due_date） */
function addDaysDate(dateStr: string, days: number): string {
  const d = new Date(dateStr.slice(0, 10))
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function weightedStatus<T extends string>(weights: Array<[T, number]>): T {
  const total = weights.reduce((sum, [, w]) => sum + w, 0)
  let r = Math.random() * total
  for (const [status, w] of weights) {
    r -= w
    if (r <= 0) return status
  }
  return weights[0][0]
}

function calcStock(reorderPt: number, idx: number, total: number, scenario: string): number {
  if (scenario === 'normal') {
    return reorderPt * (3 + randInt(0, 7))
  }
  if (scenario === 'warning') {
    const isLow = idx < Math.floor(total * 0.3)
    return isLow
      ? Math.max(0, Math.floor(reorderPt * (0.3 + Math.random() * 0.6)))
      : reorderPt * (3 + randInt(0, 6))
  }
  // empty
  const ratio = idx / total
  if (ratio < 0.2) return 0
  if (ratio < 0.4) return Math.max(0, Math.floor(reorderPt * (0.3 + Math.random() * 0.6)))
  return reorderPt * (3 + randInt(0, 6))
}

// ─── 主邏輯 ────────────────────────────────────────────────────

export function registerMockDataIpc(): void {
  ipcMain.handle('mockdata:generate', (_e, options: MockDataOptions): MockDataResult => {
    const db = getDb()

    const scaleConfig = {
      S: { products: 30, purchases: 40, sales: 80 },
      M: { products: 60, purchases: 80, sales: 160 },
      L: { products: 100, purchases: 150, sales: 300 },
    }
    const cfg = scaleConfig[options.scale]
    const todayStr = new Date().toISOString().slice(0, 10)

    const TERM_DAYS = [30, 45, 60]
    const SUPPLIER_CREDIT_LIMITS = [50000, 100000, 150000, 200000]
    const CUSTOMER_CREDIT_LIMITS = [30000, 50000, 80000, 100000]

    try {
      const counts = { suppliers: 0, customers: 0, products: 0, purchaseOrders: 0, salesOrders: 0, adjustments: 0, stockTakes: 0 }

      db.transaction(() => {
        // 1. 清除所有資料
        db.exec(`
          DELETE FROM stock_take_items;
          DELETE FROM stock_takes;
          DELETE FROM inventory_adjustments;
          DELETE FROM sale_items;
          DELETE FROM sales_orders;
          DELETE FROM purchase_items;
          DELETE FROM purchase_orders;
          DELETE FROM products;
          DELETE FROM customers;
          DELETE FROM suppliers;
        `)

        // 2. 插入供應商（含信用額度）
        const insertSupplier = db.prepare(`
          INSERT INTO suppliers (name, contact, phone, email, address, notes, credit_limit, created_at)
          VALUES (@name, @contact, @phone, @email, @address, @notes, @credit_limit, @created_at)
        `)
        const supplierIds: number[] = []
        for (const s of SUPPLIERS) {
          const credit_limit = Math.random() < 0.4
            ? SUPPLIER_CREDIT_LIMITS[randInt(0, SUPPLIER_CREDIT_LIMITS.length - 1)]
            : 0
          const r = insertSupplier.run({ ...s, credit_limit, created_at: randDate(180) })
          supplierIds.push(Number(r.lastInsertRowid))
        }
        counts.suppliers = supplierIds.length

        // 3. 插入客戶（含信用額度）
        const insertCustomer = db.prepare(`
          INSERT INTO customers (name, contact, phone, email, address, notes, credit_limit, created_at)
          VALUES (@name, @contact, @phone, @email, @address, @notes, @credit_limit, @created_at)
        `)
        const customerIds: number[] = []
        for (const c of CUSTOMERS) {
          const credit_limit = Math.random() < 0.3
            ? CUSTOMER_CREDIT_LIMITS[randInt(0, CUSTOMER_CREDIT_LIMITS.length - 1)]
            : 0
          const r = insertCustomer.run({ ...c, credit_limit, created_at: randDate(180) })
          customerIds.push(Number(r.lastInsertRowid))
        }
        counts.customers = customerIds.length

        // 4. 插入商品
        const pool = PRODUCT_POOL.slice(0, Math.min(cfg.products, PRODUCT_POOL.length))
        const productTemplates: ProductTemplate[] = []
        while (productTemplates.length < cfg.products) {
          for (const p of pool) {
            if (productTemplates.length >= cfg.products) break
            productTemplates.push(p)
          }
        }

        const insertProduct = db.prepare(`
          INSERT INTO products (sku, name, category, sell_price, buy_price, stock_qty, reorder_pt, unit, description, created_at, updated_at)
          VALUES (@sku, @name, @category, @sell_price, @buy_price, @stock_qty, @reorder_pt, @unit, @description, @created_at, @updated_at)
        `)

        const productIds: number[] = []
        const productBuyPrices: number[] = []
        const productSellPrices: number[] = []
        const productStockQtys: number[] = []
        const skuCounters: Record<string, number> = {}

        productTemplates.forEach((tmpl, idx) => {
          const prefix = SKU_PREFIX[tmpl.category] ?? 'MISC'
          skuCounters[prefix] = (skuCounters[prefix] ?? 0) + 1
          const sku = `${prefix}-${String(skuCounters[prefix]).padStart(4, '0')}`

          const buyVariance = 0.9 + Math.random() * 0.2
          const sellVariance = 0.9 + Math.random() * 0.2
          const buyPrice = Math.round(tmpl.buy * buyVariance)
          const sellPrice = Math.round(tmpl.sell * sellVariance)
          const stockQty = calcStock(tmpl.reorder, idx, cfg.products, options.scenario)
          const createdAt = randDate(180)

          const nameSuffix = skuCounters[prefix] > pool.filter(p => p.category === tmpl.category).length ? ` (${skuCounters[prefix]})` : ''

          const r = insertProduct.run({
            sku,
            name: tmpl.name + nameSuffix,
            category: tmpl.category,
            sell_price: sellPrice,
            buy_price: buyPrice,
            stock_qty: stockQty,
            reorder_pt: tmpl.reorder,
            unit: tmpl.unit,
            description: null,
            created_at: createdAt,
            updated_at: createdAt,
          })
          productIds.push(Number(r.lastInsertRowid))
          productBuyPrices.push(buyPrice)
          productSellPrices.push(sellPrice)
          productStockQtys.push(stockQty)
        })
        counts.products = productIds.length

        // 5. 插入採購單（含帳款資訊）
        const insertPO = db.prepare(`
          INSERT INTO purchase_orders (order_no, supplier_id, status, order_date, receive_date, total_amount, payment_status, payment_due_date, notes, created_at)
          VALUES (@order_no, @supplier_id, @status, @order_date, @receive_date, @total_amount, @payment_status, @payment_due_date, @notes, @created_at)
        `)
        const insertPI = db.prepare(`
          INSERT INTO purchase_items (purchase_order_id, product_id, quantity, unit_price)
          VALUES (@purchase_order_id, @product_id, @quantity, @unit_price)
        `)

        const poStatuses: Array<['pending' | 'received' | 'cancelled' | 'returned', number]> = [
          ['received', 60], ['pending', 25], ['cancelled', 10], ['returned', 5],
        ]

        for (let i = 0; i < cfg.purchases; i++) {
          const orderDate = randDate(90)
          const status = weightedStatus(poStatuses)
          const receiveDate = status === 'received' ? addDays(orderDate, randInt(1, 7)) : null

          let payment_status = 'unpaid'
          let payment_due_date: string | null = null
          if (status === 'received') {
            if (Math.random() < 0.6) {
              const termDays = TERM_DAYS[randInt(0, TERM_DAYS.length - 1)]
              payment_due_date = addDaysDate(orderDate, termDays)
              // 已過期的訂單約 50% 標記為已付
              if (payment_due_date < todayStr && Math.random() < 0.5) {
                payment_status = 'paid'
              }
            }
          }

          const supplierId = supplierIds[randInt(0, supplierIds.length - 1)]
          const orderNo = `PO-${orderDate.slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`

          const itemCount = randInt(1, 4)
          const usedIdx = new Set<number>()
          let totalAmount = 0
          const items: Array<{ product_id: number; quantity: number; unit_price: number }> = []
          while (items.length < itemCount) {
            const pidx = randInt(0, productIds.length - 1)
            if (usedIdx.has(pidx)) continue
            usedIdx.add(pidx)
            const qty = randInt(5, 50)
            const price = productBuyPrices[pidx]
            totalAmount += qty * price
            items.push({ product_id: productIds[pidx], quantity: qty, unit_price: price })
          }

          const poResult = insertPO.run({
            order_no: orderNo,
            supplier_id: supplierId,
            status,
            order_date: orderDate,
            receive_date: receiveDate,
            total_amount: totalAmount,
            payment_status,
            payment_due_date,
            notes: status === 'returned' ? '品質問題退貨' : null,
            created_at: orderDate,
          })
          const poId = Number(poResult.lastInsertRowid)
          for (const item of items) {
            insertPI.run({ purchase_order_id: poId, ...item })
          }
        }
        counts.purchaseOrders = cfg.purchases

        // 6. 插入銷售單（含帳款資訊、partial_return 狀態）
        const insertSO = db.prepare(`
          INSERT INTO sales_orders (order_no, customer_id, status, order_date, total_amount, payment_status, payment_due_date, notes, created_at)
          VALUES (@order_no, @customer_id, @status, @order_date, @total_amount, @payment_status, @payment_due_date, @notes, @created_at)
        `)
        const insertSI = db.prepare(`
          INSERT INTO sale_items (sales_order_id, product_id, quantity, unit_price)
          VALUES (@sales_order_id, @product_id, @quantity, @unit_price)
        `)

        const soStatuses: Array<['pending' | 'completed' | 'cancelled' | 'returned' | 'partial_return', number]> = [
          ['completed', 65], ['partial_return', 5], ['pending', 20], ['cancelled', 7], ['returned', 3],
        ]

        for (let i = 0; i < cfg.sales; i++) {
          const orderDate = randDate(90)
          const status = weightedStatus(soStatuses)
          const customerId = customerIds[randInt(0, customerIds.length - 1)]
          const orderNo = `SO-${orderDate.slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`

          let payment_status = 'unpaid'
          let payment_due_date: string | null = null
          if (status === 'completed' || status === 'partial_return') {
            if (Math.random() < 0.6) {
              const termDays = TERM_DAYS[randInt(0, TERM_DAYS.length - 1)]
              payment_due_date = addDaysDate(orderDate, termDays)
              // 已過期的訂單約 50% 標記為已付
              if (payment_due_date < todayStr && Math.random() < 0.5) {
                payment_status = 'paid'
              }
            }
          }

          const itemCount = randInt(1, 5)
          const usedIdx = new Set<number>()
          let totalAmount = 0
          const items: Array<{ product_id: number; quantity: number; unit_price: number }> = []
          while (items.length < itemCount) {
            const pidx = randInt(0, productIds.length - 1)
            if (usedIdx.has(pidx)) continue
            usedIdx.add(pidx)
            const qty = randInt(1, 15)
            const price = productSellPrices[pidx]
            totalAmount += qty * price
            items.push({ product_id: productIds[pidx], quantity: qty, unit_price: price })
          }

          const soResult = insertSO.run({
            order_no: orderNo,
            customer_id: customerId,
            status,
            order_date: orderDate,
            total_amount: totalAmount,
            payment_status,
            payment_due_date,
            notes: status === 'returned' ? '客戶申請退貨' : null,
            created_at: orderDate,
          })
          const soId = Number(soResult.lastInsertRowid)
          for (const item of items) {
            insertSI.run({ sales_order_id: soId, ...item })
          }
        }
        counts.salesOrders = cfg.sales

        // 7. 帳款情境訂單（確保警示功能可見）
        // 輔助：生成單品 SO
        const insertScenarioSO = (
          orderNo: string,
          customerId: number,
          status: string,
          orderDateStr: string,
          paymentDueDate: string | null,
          paymentStatus: string
        ) => {
          const pidx = randInt(0, productIds.length - 1)
          const qty = randInt(1, 10)
          const price = productSellPrices[pidx]
          const soResult = insertSO.run({
            order_no: orderNo,
            customer_id: customerId,
            status,
            order_date: orderDateStr + ' 09:00:00',
            total_amount: qty * price,
            payment_status: paymentStatus,
            payment_due_date: paymentDueDate,
            notes: null,
            created_at: orderDateStr + ' 09:00:00',
          })
          insertSI.run({ sales_order_id: Number(soResult.lastInsertRowid), product_id: productIds[pidx], quantity: qty, unit_price: price })
          counts.salesOrders++
        }

        // 輔助：生成單品 PO
        const insertScenarioPO = (
          orderNo: string,
          supplierId: number,
          orderDateStr: string,
          paymentDueDate: string | null,
          paymentStatus: string
        ) => {
          const pidx = randInt(0, productIds.length - 1)
          const qty = randInt(5, 30)
          const price = productBuyPrices[pidx]
          const receiveDate = addDaysDate(orderDateStr, randInt(1, 5)) + ' 10:00:00'
          const poResult = insertPO.run({
            order_no: orderNo,
            supplier_id: supplierId,
            status: 'received',
            order_date: orderDateStr + ' 09:00:00',
            receive_date: receiveDate,
            total_amount: qty * price,
            payment_status: paymentStatus,
            payment_due_date: paymentDueDate,
            notes: null,
            created_at: orderDateStr + ' 09:00:00',
          })
          insertPI.run({ purchase_order_id: Number(poResult.lastInsertRowid), product_id: productIds[pidx], quantity: qty, unit_price: price })
          counts.purchaseOrders++
        }

        // 逾期未付（銷售）：3–5 筆
        const overdueSOCount = randInt(3, 5)
        for (let i = 0; i < overdueSOCount; i++) {
          const daysOverdue = randInt(3, 45)
          const dueDate = addDaysDate(todayStr, -daysOverdue)
          const orderDate = addDaysDate(dueDate, -randInt(30, 60))
          insertScenarioSO(
            `SO-OVD-${String(i + 1).padStart(3, '0')}`,
            customerIds[randInt(0, customerIds.length - 1)],
            'completed',
            orderDate,
            dueDate,
            'unpaid'
          )
        }

        // 逾期未付（採購）：2–3 筆
        const overduePoCount = randInt(2, 3)
        for (let i = 0; i < overduePoCount; i++) {
          const daysOverdue = randInt(3, 30)
          const dueDate = addDaysDate(todayStr, -daysOverdue)
          const orderDate = addDaysDate(dueDate, -randInt(30, 60))
          insertScenarioPO(
            `PO-OVD-${String(i + 1).padStart(3, '0')}`,
            supplierIds[randInt(0, supplierIds.length - 1)],
            orderDate,
            dueDate,
            'unpaid'
          )
        }

        // 7天內到期（銷售）：2–3 筆
        const dueSoonSOCount = randInt(2, 3)
        for (let i = 0; i < dueSoonSOCount; i++) {
          const daysSoon = randInt(1, 7)
          const dueDate = addDaysDate(todayStr, daysSoon)
          const orderDate = addDaysDate(dueDate, -randInt(30, 60))
          insertScenarioSO(
            `SO-DUE-${String(i + 1).padStart(3, '0')}`,
            customerIds[randInt(0, customerIds.length - 1)],
            'completed',
            orderDate,
            dueDate,
            'unpaid'
          )
        }

        // 7天內到期（採購）：1–2 筆
        const dueSoonPoCount = randInt(1, 2)
        for (let i = 0; i < dueSoonPoCount; i++) {
          const daysSoon = randInt(1, 7)
          const dueDate = addDaysDate(todayStr, daysSoon)
          const orderDate = addDaysDate(dueDate, -randInt(30, 60))
          insertScenarioPO(
            `PO-DUE-${String(i + 1).padStart(3, '0')}`,
            supplierIds[randInt(0, supplierIds.length - 1)],
            orderDate,
            dueDate,
            'unpaid'
          )
        }

        // 今日到期（銷售）：1 筆
        {
          const orderDate = addDaysDate(todayStr, -randInt(30, 60))
          insertScenarioSO(
            'SO-TODAY-001',
            customerIds[randInt(0, customerIds.length - 1)],
            'completed',
            orderDate,
            todayStr,
            'unpaid'
          )
        }

        // 8. 插入庫存調整記錄
        const insertAdj = db.prepare(`
          INSERT INTO inventory_adjustments (product_id, delta, reason, note, adjusted_by, adjusted_at)
          VALUES (@product_id, @delta, @reason, @note, @adjusted_by, @adjusted_at)
        `)

        const adjusters = ['admin', '王志明', '林佳穎', '陳建宏', '張美玲']
        let adjCount = 0
        for (const pid of productIds) {
          const numAdj = randInt(1, 3)
          for (let j = 0; j < numAdj; j++) {
            const reason = ADJUST_REASONS[randInt(0, ADJUST_REASONS.length - 1)]
            const delta = reason === '損耗' ? -randInt(1, 5) : randInt(1, 20)
            insertAdj.run({
              product_id: pid,
              delta,
              reason,
              note: null,
              adjusted_by: adjusters[randInt(0, adjusters.length - 1)],
              adjusted_at: randDate(90),
            })
            adjCount++
          }
        }
        counts.adjustments = adjCount

        // 9. 插入庫存盤點記錄
        const insertStockTake = db.prepare(`
          INSERT INTO stock_takes (take_no, status, notes, created_at, completed_at)
          VALUES (@take_no, @status, @notes, @created_at, @completed_at)
        `)
        const insertStockTakeItem = db.prepare(`
          INSERT INTO stock_take_items (stock_take_id, product_id, system_qty, counted_qty)
          VALUES (@stock_take_id, @product_id, @system_qty, @counted_qty)
        `)

        // 隨機抽取盤點商品子集（25–40% 的商品）
        const pickProductsForTake = (count: number): number[] => {
          const shuffled = [...productIds.keys()].sort(() => Math.random() - 0.5)
          return shuffled.slice(0, count)
        }

        // 2–3 筆已完成的歷史盤點
        const completedTakeCount = randInt(2, 3)
        for (let i = 0; i < completedTakeCount; i++) {
          const daysAgo = randInt(20, 90) - i * 20
          const createdAt = addDaysDate(todayStr, -daysAgo) + ' 09:00:00'
          const completedAt = addDaysDate(todayStr, -daysAgo) + ' 17:30:00'
          const takeNo = `ST-${addDaysDate(todayStr, -daysAgo).replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`

          const r = insertStockTake.run({
            take_no: takeNo,
            status: 'completed',
            notes: i === 0 ? '季度盤點' : '月度定期盤點',
            created_at: createdAt,
            completed_at: completedAt,
          })
          const stId = Number(r.lastInsertRowid)

          const itemCount = Math.floor(productIds.length * (0.25 + Math.random() * 0.15))
          const indices = pickProductsForTake(itemCount)
          for (const idx of indices) {
            const systemQty = productStockQtys[idx]
            // 80% 吻合，20% 有差異（±1 ~ ±5）
            const hasDiff = Math.random() < 0.2
            const counted_qty = hasDiff
              ? Math.max(0, systemQty + (Math.random() < 0.5 ? -1 : 1) * randInt(1, 5))
              : systemQty
            insertStockTakeItem.run({ stock_take_id: stId, product_id: productIds[idx], system_qty: systemQty, counted_qty })
          }
          counts.stockTakes++
        }

        // 1 筆進行中的盤點（draft，部分已盤、部分未盤）
        {
          const takeNo = `ST-${todayStr.replace(/-/g, '')}-DRAFT`
          const r = insertStockTake.run({
            take_no: takeNo,
            status: 'draft',
            notes: '本月盤點（進行中）',
            created_at: todayStr + ' 08:00:00',
            completed_at: null,
          })
          const stId = Number(r.lastInsertRowid)

          const itemCount = Math.floor(productIds.length * (0.3 + Math.random() * 0.15))
          const indices = pickProductsForTake(itemCount)
          for (const [j, idx] of indices.entries()) {
            const systemQty = productStockQtys[idx]
            // 前半部分已盤，後半部分未盤（counted_qty = null）
            const alreadyCounted = j < Math.floor(indices.length * 0.6)
            const counted_qty = alreadyCounted
              ? (Math.random() < 0.15 ? Math.max(0, systemQty + randInt(-3, 3)) : systemQty)
              : null
            insertStockTakeItem.run({ stock_take_id: stId, product_id: productIds[idx], system_qty: systemQty, counted_qty })
          }
          counts.stockTakes++
        }
      })()

      return { success: true, counts }
    } catch (err) {
      return {
        success: false,
        counts: { suppliers: 0, customers: 0, products: 0, purchaseOrders: 0, salesOrders: 0, adjustments: 0, stockTakes: 0 },
        error: String(err),
      }
    }
  })
}
