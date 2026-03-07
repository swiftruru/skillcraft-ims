# import-data

> 引導 CSV 資料匯入：自動偵測欄位、映射到資料庫欄位、事務性寫入。

## 說明

此 Skill 協助使用者將 CSV 檔案匯入 SkillCraft IMS，
支援商品、供應商、客戶三種類型。會自動偵測欄位並處理中英文欄位名稱。

## 使用方式

在 Claude Code 中輸入：`/import-data`

---

## 執行步驟

1. **詢問匯入類型與檔案路徑**

   問：
   - 要匯入什麼？（商品 Products / 供應商 Suppliers / 客戶 Customers）
   - CSV 檔案的完整路徑？

2. **讀取並分析 CSV 結構**

   ```bash
   # 顯示前 5 列（包含標題行）
   head -6 "/path/to/file.csv"
   ```

   自動辨識常見欄位名稱（支援中英文）：

   **商品欄位映射**：
   | CSV 可能名稱 | 資料庫欄位 | 必填 |
   |---|---|---|
   | SKU / 品號 / 料號 | `sku` | ✓ |
   | 商品名稱 / 品名 / Name | `name` | ✓ |
   | 類別 / Category | `category` | - |
   | 售價 / Sell Price / 銷售價 | `sell_price` | - |
   | 進價 / Buy Price / 成本 | `buy_price` | - |
   | 庫存 / Stock / 數量 | `stock_qty` | - |
   | 補貨點 / Reorder / 安全庫存 | `reorder_pt` | - |
   | 單位 / Unit | `unit` | - |

3. **顯示欄位映射方案並確認**

   ```
   偵測到的欄位映射：
   CSV 欄位          → 資料庫欄位
   "品號"            → sku       ✓
   "品名"            → name      ✓
   "類別"            → category  ✓
   "進貨價"          → buy_price ✓
   "建議售價"        → sell_price✓
   "現有庫存"        → stock_qty ✓
   "安全庫存量"      → reorder_pt✓

   共 [N] 筆資料將被匯入。
   已有重複 SKU 時：更新現有記錄 / 跳過 / 詢問？
   ```

4. **產生並執行匯入腳本**

   使用 Node.js + better-sqlite3 執行事務性匯入：

   ```javascript
   // 自動產生並執行此腳本
   const Database = require('better-sqlite3')
   const fs = require('fs')
   const path = require('path')

   const DB_PATH = path.join(
     process.env.HOME,
     'Library/Application Support/skillcraft-ims/ims.db'
   )
   const db = new Database(DB_PATH)

   // 讀取 CSV（簡易解析）
   const lines = fs.readFileSync('/path/to/file.csv', 'utf-8').split('\n')
   const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

   // 欄位映射（依偵測結果）
   const fieldMap = { /* ... */ }

   const upsert = db.prepare(`
     INSERT INTO products (sku, name, category, sell_price, buy_price, stock_qty, reorder_pt, unit)
     VALUES (@sku, @name, @category, @sell_price, @buy_price, @stock_qty, @reorder_pt, @unit)
     ON CONFLICT(sku) DO UPDATE SET
       name = excluded.name, category = excluded.category,
       sell_price = excluded.sell_price, buy_price = excluded.buy_price,
       updated_at = datetime('now')
   `)

   let success = 0, skipped = 0, errors = []
   db.transaction(() => {
     for (let i = 1; i < lines.length; i++) {
       if (!lines[i].trim()) continue
       // ... 解析並匯入
     }
   })()

   console.log(`✓ 匯入完成：${success} 筆成功，${skipped} 筆跳過，${errors.length} 筆錯誤`)
   ```

5. **回報結果**

   顯示：
   - 成功匯入數量
   - 跳過/更新數量
   - 錯誤列表（含行號與原因）
   - 提醒在 app 中重新整理商品列表

   **安全提醒**：若匯入超過 50 筆，建議先備份資料庫：
   ```bash
   cp ~/Library/Application\ Support/skillcraft-ims/ims.db \
      ~/Library/Application\ Support/skillcraft-ims/ims.db.backup.$(date +%Y%m%d%H%M%S)
   ```
