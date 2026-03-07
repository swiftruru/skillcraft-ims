---
name: import-data
description: 當使用者要求匯入 CSV 資料、批次新增商品或從舊系統遷移資料時觸發。
---

## CSV 匯入規範

1. **前置詢問**：開始前必須詢問兩件事：（a）匯入類型（商品 / 供應商 / 客戶）；（b）CSV 檔案的完整路徑。

2. **欄位自動偵測**：讀取 CSV 前 6 列分析欄位結構，支援中英文欄位名稱自動映射。

   ```bash
   head -6 "/path/to/file.csv"
   ```

   **商品欄位映射對照**：

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

3. **確認映射方案**：執行前顯示偵測到的欄位映射與資料筆數，並詢問重複 SKU 的處理方式（更新 / 跳過）。

4. **事務性寫入**：使用 `better-sqlite3` 以單一 Transaction 執行所有寫入，任何錯誤均 rollback，確保資料一致性。

   ```javascript
   const Database = require('better-sqlite3')
   const fs = require('fs')
   const path = require('path')

   const DB_PATH = path.join(
     process.env.HOME,
     'Library/Application Support/skillcraft-ims/ims.db'
   )
   const db = new Database(DB_PATH)

   const lines = fs.readFileSync('/path/to/file.csv', 'utf-8').split('\n')
   const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

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
       // 解析並寫入
     }
   })()

   console.log(`匯入完成：${success} 筆成功，${skipped} 筆跳過，${errors.length} 筆錯誤`)
   ```

5. **結果回報**：輸出成功/跳過/錯誤筆數，並列出所有錯誤行號與原因。超過 50 筆時先自動備份資料庫。

   ```bash
   cp ~/Library/Application\ Support/skillcraft-ims/ims.db \
      ~/Library/Application\ Support/skillcraft-ims/ims.db.backup.$(date +%Y%m%d%H%M%S)
   ```
