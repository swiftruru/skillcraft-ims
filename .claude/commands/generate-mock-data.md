---
name: generate-mock-data
description: 當使用者要求產生測試資料、填充範例資料或壓力測試系統時觸發。
---

## Mock 資料生成規範

1. **資料庫確認**：執行前先確認資料庫存在，並查詢現有各資料表的筆數。

   ```bash
   DB=~/Library/Application\ Support/skillcraft-ims/ims.db
   ls -lh "$DB" || echo "資料庫尚未建立，請先啟動 SkillCraft IMS app"

   sqlite3 "$DB" "
   SELECT
     (SELECT COUNT(*) FROM suppliers) as suppliers,
     (SELECT COUNT(*) FROM customers) as customers,
     (SELECT COUNT(*) FROM products) as products,
     (SELECT COUNT(*) FROM purchase_orders) as purchase_orders,
     (SELECT COUNT(*) FROM sales_orders) as sales_orders
   " -column -header
   ```

2. **前置詢問**：若無命令列參數，詢問三個設定：
   - **規模**：S（20 商品）/ M（50 商品，預設）/ L（100 商品）
   - **情境**：Normal（正常庫存）/ Warning（30% 低庫存）/ Empty（20% 庫存歸零）
   - **模式**：Append（追加）/ Reset（清除後重新寫入）

3. **Reset 模式備份**：選擇 Reset 模式時，必須先備份資料庫再執行清除。

   ```bash
   cp "$DB" "${DB}.backup.$(date +%Y%m%d%H%M%S)"
   ```

4. **事務性寫入**：使用 `better-sqlite3` 以單一 Transaction 寫入所有資料，包含供應商、客戶、商品、採購單（含品項）、銷售單（含品項），任何錯誤均 rollback。

   ```javascript
   const Database = require('better-sqlite3')
   const path = require('path')
   const os = require('os')

   const DB_PATH = path.join(os.homedir(), 'Library/Application Support/skillcraft-ims/ims.db')
   const MODE = 'append'     // 'append' | 'reset'
   const SCENARIO = 'normal' // 'normal' | 'warning' | 'empty'
   const CONFIG = { suppliers: 5, customers: 8, products: 50, purchaseOrders: 80, salesOrders: 150, daysBack: 90 }

   const db = new Database(DB_PATH)
   db.pragma('journal_mode = WAL')
   db.pragma('foreign_keys = ON')

   db.transaction(() => {
     if (MODE === 'reset') {
       db.exec(`DELETE FROM sale_items; DELETE FROM sales_orders;
                DELETE FROM purchase_items; DELETE FROM purchase_orders;
                DELETE FROM products; DELETE FROM customers; DELETE FROM suppliers;`)
     }
     // 依序寫入供應商、客戶、商品、採購單、銷售單
     // 商品庫存依 SCENARIO 調整：warning 模式約 33% 低庫存，empty 模式約 20% 庫存歸零
   })()
   ```

5. **驗證與後續提示**：寫入完成後查詢各表筆數確認結果，並提示使用者重新整理 app（Cmd+R）及可執行的後續 skill（`/inventory-report`、`/reorder-alert`、`/sales-analysis`）。

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
