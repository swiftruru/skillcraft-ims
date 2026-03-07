# generate-mock-data

> 依使用者指定的規模與情境，對所有資料表產生真實感 Mock 資料，
> 支援清除模式、追加模式，並可指定特定情境（如低庫存壓力測試）。

## 說明

此 Skill 會直接對 SkillCraft IMS 的 SQLite 資料庫寫入 Mock 資料，
適合開發階段快速填充測試資料、展示系統功能或壓力測試報表。

所有寫入操作均以 **事務（Transaction）** 執行，可安全回滾。

## 使用方式

在 Claude Code 中輸入：
- `/generate-mock-data` — 互動式選擇
- `/generate-mock-data small` — 小型資料集（20 商品）
- `/generate-mock-data large` — 大型資料集（100 商品）
- `/generate-mock-data stress` — 低庫存壓力情境

---

## 執行步驟

### 步驟 1：確認資料庫位置

```bash
DB=~/Library/Application\ Support/skillcraft-ims/ims.db
ls -lh "$DB" || echo "資料庫尚未建立，請先啟動 SkillCraft IMS app"
```

### 步驟 2：詢問使用者

若無命令列參數，詢問：

```
Mock 資料生成設定
─────────────────────────────
1) 規模
   [S] Small  — 3 供應商、3 客戶、20 商品、30 採購單、50 銷售單
   [M] Medium — 5 供應商、8 客戶、50 商品、80 採購單、150 銷售單（預設）
   [L] Large  — 10 供應商、20 客戶、100 商品、200 採購單、400 銷售單

2) 情境
   [N] Normal  — 正常庫存水位（預設）
   [W] Warning — 30% 商品低於補貨點（測試警示）
   [E] Empty   — 多項商品庫存歸零（測試極端情況）

3) 模式
   [A] Append — 追加到現有資料（保留原有資料）
   [R] Reset  — 先清除所有資料再寫入（全新開始）

現有資料：? 供應商 / ? 客戶 / ? 商品 / ? 採購單 / ? 銷售單
```

先查詢現有資料量：
```bash
sqlite3 "$DB" "
SELECT
  (SELECT COUNT(*) FROM suppliers) as suppliers,
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM purchase_orders) as purchase_orders,
  (SELECT COUNT(*) FROM sales_orders) as sales_orders
" -column -header
```

### 步驟 3：備份（若選擇 Reset 模式）

```bash
cp "$DB" "${DB}.backup.$(date +%Y%m%d%H%M%S)"
echo "✓ 已備份至 ${DB}.backup.$(date +%Y%m%d%H%M%S)"
```

### 步驟 4：產生並執行 Node.js 寫入腳本

根據使用者選擇，產生以下完整腳本並用 `node` 執行：

```javascript
const Database = require('better-sqlite3')
const path = require('path')
const os = require('os')

// ── 設定 ──────────────────────────────────────────
const DB_PATH = path.join(os.homedir(), 'Library/Application Support/skillcraft-ims/ims.db')
const MODE = 'append'    // 'append' | 'reset'
const SCENARIO = 'normal' // 'normal' | 'warning' | 'empty'

// 規模設定（依使用者選擇調整數字）
const CONFIG = {
  suppliers: 5,
  customers: 8,
  products: 50,
  purchaseOrders: 80,
  salesOrders: 150,
  daysBack: 90  // 歷史資料的時間跨度（天）
}

// ── 真實感資料庫 ────────────────────────────────
const SUPPLIER_NAMES = [
  '台灣電子科技股份有限公司', '全球零件批發有限公司', '優質文具批發商行',
  '亞太包裝材料公司', '新世代電腦周邊', '精品辦公用品', '泛亞供應鏈管理',
  '台北數位物流', '南方貿易股份有限公司', '東方科技配件'
]
const SUPPLIER_CONTACTS = ['王大明', '李小華', '陳美玲', '張志強', '林雅婷', '黃建國', '吳雪梅', '蔡明哲', '鄭淑芬', '劉俊賢']
const CUSTOMER_NAMES = [
  '大型連鎖零售商', '中小型電商公司', '企業採購部門', '學校教育機構',
  '政府機關採購', '醫療院所', '個人工作室', '新創公司', '傳統批發商', '直播電商業者',
  '社區大學', '工廠採購部', '非營利組織', '設計事務所', '科技新創', '餐飲連鎖', '建設公司', '貿易商'
]
const PRODUCT_DATA = [
  // [name, category, sell_price, buy_price, unit]
  ['USB-C 充電器 65W', '電子產品', 890, 450, '個'],
  ['藍牙耳機 Pro', '電子產品', 2990, 1500, '個'],
  ['HDMI 線 2.0 2M', '電子產品', 350, 120, '條'],
  ['無線滑鼠', '電子產品', 790, 380, '個'],
  ['機械鍵盤 青軸', '電子產品', 3200, 1800, '個'],
  ['27吋 4K 顯示器', '電子產品', 12900, 8000, '台'],
  ['網路攝影機 1080P', '電子產品', 1890, 950, '個'],
  ['外接 SSD 1TB', '電子產品', 2490, 1200, '個'],
  ['USB 集線器 7口', '電腦周邊', 650, 300, '個'],
  ['螢幕支架 可調式', '電腦周邊', 1200, 580, '個'],
  ['網路線 Cat.6 5M', '電腦周邊', 180, 60, '條'],
  ['電腦桌面清潔組', '電腦周邊', 280, 90, '組'],
  ['無線充電板', '電腦周邊', 590, 250, '個'],
  ['A4 影印紙 500張', '文具', 120, 65, '包'],
  ['原子筆 藍 10支裝', '文具', 85, 35, '盒'],
  ['資料夾 A4', '文具', 45, 18, '個'],
  ['白板筆組 4色', '文具', 160, 70, '組'],
  ['訂書機', '文具', 320, 140, '個'],
  ['便利貼 3x3 100張', '文具', 55, 20, '本'],
  ['計算機 12位', '文具', 450, 180, '個'],
  ['氣泡紙 50M捲', '包裝材料', 290, 120, '捲'],
  ['紙箱 中型 50入', '包裝材料', 450, 200, '組'],
  ['封箱膠帶 10捲', '包裝材料', 220, 80, '組'],
  ['泡棉墊 A4', '包裝材料', 380, 150, '包'],
  ['延長線 3插 3M', '雜項', 380, 170, '個'],
  ['LED 桌燈', '雜項', 690, 320, '個'],
  ['電池 AA 4入', '雜項', 95, 35, '組'],
  ['滑鼠墊 大型', '雜項', 250, 90, '個'],
]

// ── 工具函式 ────────────────────────────────────
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function randFloat(min, max, decimals = 0) {
  const val = Math.random() * (max - min) + min
  return parseFloat(val.toFixed(decimals))
}
function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function dateOffset(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}
function genSku(category, index) {
  const prefixes = {
    '電子產品': 'ELEC', '電腦周邊': 'COMP', '文具': 'STAT', '包裝材料': 'PACK', '雜項': 'MISC'
  }
  const prefix = prefixes[category] || 'MISC'
  return `${prefix}-${String(index).padStart(3, '0')}`
}
function genOrderNo(prefix, date, index) {
  return `${prefix}-${date.replace(/-/g, '').slice(0, 6)}-${String(index).padStart(4, '0')}`
}

// ── 主程式 ──────────────────────────────────────
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

let stats = { suppliers: 0, customers: 0, products: 0, purchases: 0, sales: 0 }

db.transaction(() => {
  // Reset 模式
  if (MODE === 'reset') {
    db.exec(`
      DELETE FROM sale_items;
      DELETE FROM sales_orders;
      DELETE FROM purchase_items;
      DELETE FROM purchase_orders;
      DELETE FROM products;
      DELETE FROM customers;
      DELETE FROM suppliers;
      DELETE FROM sync_log;
    `)
  }

  // ── 1. 供應商 ──
  const insertSupplier = db.prepare(`
    INSERT OR IGNORE INTO suppliers (name, contact, phone, email, address)
    VALUES (@name, @contact, @phone, @email, @address)
  `)
  for (let i = 0; i < CONFIG.suppliers; i++) {
    const name = SUPPLIER_NAMES[i % SUPPLIER_NAMES.length]
    insertSupplier.run({
      name,
      contact: SUPPLIER_CONTACTS[i % SUPPLIER_CONTACTS.length],
      phone: `0${randInt(2,9)}-${randInt(1000,9999)}-${randInt(1000,9999)}`,
      email: `contact@${name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0,10)}.com.tw`,
      address: `台${randItem(['北','中','南','東'])}市${randItem(['信義','大安','中正','西'])}區某路${randInt(1,999)}號`
    })
    stats.suppliers++
  }
  const suppliers = db.prepare('SELECT id FROM suppliers ORDER BY id').all()

  // ── 2. 客戶 ──
  const insertCustomer = db.prepare(`
    INSERT OR IGNORE INTO customers (name, contact, phone, email, address)
    VALUES (@name, @contact, @phone, @email, @address)
  `)
  for (let i = 0; i < CONFIG.customers; i++) {
    const name = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length]
    insertCustomer.run({
      name,
      contact: SUPPLIER_CONTACTS[i % SUPPLIER_CONTACTS.length],
      phone: `09${randInt(10,99)}-${randInt(100,999)}-${randInt(100,999)}`,
      email: `purchase@${name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0,8)}.com`,
      address: `台灣某市某區某路${randInt(1,999)}號`
    })
    stats.customers++
  }
  const customers = db.prepare('SELECT id FROM customers ORDER BY id').all()

  // ── 3. 商品 ──
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (sku, name, category, sell_price, buy_price, stock_qty, reorder_pt, unit, description)
    VALUES (@sku, @name, @category, @sell_price, @buy_price, @stock_qty, @reorder_pt, @unit, @description)
  `)
  const productPool = [...PRODUCT_DATA]
  // 若需要超過內建數量，自動衍生變體
  while (productPool.length < CONFIG.products) {
    const base = PRODUCT_DATA[productPool.length % PRODUCT_DATA.length]
    productPool.push([
      `${base[0]} v${Math.floor(productPool.length / PRODUCT_DATA.length) + 2}`,
      base[1], base[2] * randFloat(0.8, 1.3, 0), base[3] * randFloat(0.8, 1.3, 0), base[4]
    ])
  }

  for (let i = 0; i < CONFIG.products; i++) {
    const [name, category, sell, buy, unit] = productPool[i]
    const reorderPt = randInt(5, 20)
    let stockQty
    if (SCENARIO === 'empty' && i % 5 === 0) {
      stockQty = 0
    } else if (SCENARIO === 'warning' && i % 3 === 0) {
      stockQty = randInt(0, reorderPt)
    } else {
      stockQty = randInt(reorderPt + 1, reorderPt * 6)
    }
    insertProduct.run({
      sku: genSku(category, i + 1),
      name, category,
      sell_price: Math.round(sell),
      buy_price: Math.round(buy),
      stock_qty: stockQty,
      reorder_pt: reorderPt,
      unit,
      description: `${name}，品質保證，適合各種使用場景`
    })
    stats.products++
  }
  const products = db.prepare('SELECT id, buy_price, sell_price FROM products ORDER BY id').all()

  // ── 4. 採購單 ──
  const insertPO = db.prepare(`
    INSERT INTO purchase_orders (order_no, supplier_id, status, order_date, receive_date, total_amount, notes)
    VALUES (@order_no, @supplier_id, @status, @order_date, @receive_date, @total_amount, @notes)
  `)
  const insertPI = db.prepare(`
    INSERT INTO purchase_items (purchase_order_id, product_id, quantity, unit_price)
    VALUES (@purchase_order_id, @product_id, @quantity, @unit_price)
  `)

  for (let i = 0; i < CONFIG.purchaseOrders; i++) {
    const daysAgo = randInt(1, CONFIG.daysBack)
    const orderDate = dateOffset(daysAgo)
    const status = daysAgo > 7 ? 'received' : randItem(['pending', 'pending', 'received'])
    const receiveDate = status === 'received' ? dateOffset(daysAgo - randInt(1, 5)) : null
    const supplier = randItem(suppliers)
    const itemCount = randInt(1, 4)
    let total = 0

    const poResult = insertPO.run({
      order_no: genOrderNo('PO', orderDate, i + 1),
      supplier_id: supplier.id,
      status, orderDate, receive_date: receiveDate,
      total_amount: 0,
      notes: Math.random() > 0.7 ? `第 ${i+1} 批採購` : null
    })
    const poId = poResult.lastInsertRowid

    // 隨機挑選商品
    const chosen = [...products].sort(() => Math.random() - 0.5).slice(0, itemCount)
    for (const p of chosen) {
      const qty = randInt(5, 50)
      const price = Math.round(p.buy_price * randFloat(0.9, 1.05, 2))
      insertPI.run({ purchase_order_id: poId, product_id: p.id, quantity: qty, unit_price: price })
      total += qty * price
    }
    db.prepare('UPDATE purchase_orders SET total_amount = ? WHERE id = ?').run(total, poId)
    stats.purchases++
  }

  // ── 5. 銷售單 ──
  const insertSO = db.prepare(`
    INSERT INTO sales_orders (order_no, customer_id, status, order_date, total_amount, notes)
    VALUES (@order_no, @customer_id, @status, @order_date, @total_amount, @notes)
  `)
  const insertSI = db.prepare(`
    INSERT INTO sale_items (sales_order_id, product_id, quantity, unit_price)
    VALUES (@sales_order_id, @product_id, @quantity, @unit_price)
  `)

  for (let i = 0; i < CONFIG.salesOrders; i++) {
    const daysAgo = randInt(0, CONFIG.daysBack)
    const orderDate = dateOffset(daysAgo)
    // 最近幾天的訂單保留 pending 狀態，模擬真實情況
    const status = daysAgo > 3 ? 'completed' : randItem(['pending', 'pending', 'completed'])
    const customer = Math.random() > 0.15 ? randItem(customers) : null
    const itemCount = randInt(1, 5)
    let total = 0

    const soResult = insertSO.run({
      order_no: genOrderNo('SO', orderDate, i + 1),
      customer_id: customer ? customer.id : null,
      status, order_date: orderDate,
      total_amount: 0,
      notes: Math.random() > 0.8 ? `優先處理` : null
    })
    const soId = soResult.lastInsertRowid

    const chosen = [...products].sort(() => Math.random() - 0.5).slice(0, itemCount)
    for (const p of chosen) {
      const qty = randInt(1, 10)
      const price = Math.round(p.sell_price * randFloat(0.95, 1.02, 2))
      insertSI.run({ sales_order_id: soId, product_id: p.id, quantity: qty, unit_price: price })
      total += qty * price
    }
    db.prepare('UPDATE sales_orders SET total_amount = ? WHERE id = ?').run(total, soId)
    stats.sales++
  }

})()

console.log(`
✓ Mock 資料生成完成！
  供應商：${stats.suppliers} 筆
  客戶：  ${stats.customers} 筆
  商品：  ${stats.products} 筆
  採購單：${stats.purchases} 筆
  銷售單：${stats.sales} 筆

  情境：${SCENARIO}（${SCENARIO === 'warning' ? '~33% 商品低庫存' : SCENARIO === 'empty' ? '~20% 商品庫存歸零' : '正常庫存水位'}）
  模式：${MODE === 'reset' ? '已清除舊資料後重新寫入' : '追加至現有資料'}
`)
```

### 步驟 5：驗證寫入結果

```bash
sqlite3 "$DB" "
SELECT '供應商' as table_name, COUNT(*) as count FROM suppliers
UNION ALL SELECT '客戶', COUNT(*) FROM customers
UNION ALL SELECT '商品', COUNT(*) FROM products
UNION ALL SELECT '採購單', COUNT(*) FROM purchase_orders
UNION ALL SELECT '銷售單', COUNT(*) FROM sales_orders
UNION ALL SELECT '低庫存商品', COUNT(*) FROM products WHERE stock_qty <= reorder_pt
" -column -header
```

### 步驟 6：回報並建議後續動作

輸出摘要後提示使用者：

```
✓ Mock 資料寫入完成！

建議後續操作：
  • 重新整理 SkillCraft IMS app（Cmd+R）查看新資料
  • 執行 /inventory-report 測試庫存分析報告
  • 執行 /reorder-alert 查看低庫存警示（如選擇 warning 情境）
  • 執行 /sales-analysis 查看銷售趨勢
  • 在 app 設定頁面觸發同步，測試 Google Sheets 雙向同步

如需清除 Mock 資料，可再次執行 /generate-mock-data 並選擇 Reset 模式。
```
