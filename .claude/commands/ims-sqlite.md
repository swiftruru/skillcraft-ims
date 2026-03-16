---
name: ims-sqlite
description: 當使用者要求新增或修改資料庫操作、Model 函式、Migration SQL 或 IPC handler 時觸發。
---

## SQLite 開發規範

1. **Transaction 強制要求**：所有同時修改多張資料表的操作，必須包在 `db.transaction(() => { ... })()` 內執行，確保原子性。

2. **庫存扣減保護**：銷售操作扣減 `stock_qty` 前，必須先以 `SELECT stock_qty FROM products WHERE id = ?` 確認庫存充足，不足時 `throw new Error('庫存不足')` 讓 transaction 自動 rollback。

3. **WAL 模式**：所有建立 `better-sqlite3` 連線的程式碼，初始化後必須立即設定：
   ```typescript
   db.pragma('journal_mode = WAL')
   db.pragma('foreign_keys = ON')
   ```

4. **Model 函式位置**：新增的 Model 函式統一放在 `src/main/db/models/` 對應檔案，使用 `getDb()` 取得共用連線，不自行建立新的 Database 實例。

5. **Migration 規則**：新增資料表或欄位必須建立新的 migration 檔案（如 `003_xxx.sql`），不修改已有的 migration 檔，schema 變更以 `ALTER TABLE` 或新增資料表實現。

6. **金額欄位型別**：`sell_price`、`buy_price`、`total_amount` 等金額欄位統一使用 `REAL`（SQLite）/ `number`（TypeScript），顯示時由 UI 層格式化為 `NT$ X,XXX`。

7. **商品圖片欄位**：`products` 表透過 migration `011_product_images.sql` 新增 `image_data TEXT NULL` 欄位，儲存前端壓縮後的 base64 字串（格式 `data:image/jpeg;base64,...`）：
   - `products:getAll` 與 `products:getById` **不回傳** `image_data`（避免大量資料傳輸），Product type 不含此欄位
   - 圖片透過獨立 IPC 操作：`products:setImage(id: number, base64: string | null)` 寫入/清除；`products:getImage(id: number)` 回傳 `string | null`
   - `products:setImage` 直接 `UPDATE products SET image_data=?, updated_at=datetime('now') WHERE id=?`

8. **AVCO 移動加權平均成本**：`products` 表透過 migration `012_avco_cost.sql` 新增 `avg_cost REAL DEFAULT 0` 欄位：
   - 新增商品時 `avg_cost` 初始化為 `buy_price`（INSERT 時帶入）
   - 採購收貨（`purchases:receive`）時在 transaction 內計算：`new_avg = (current_qty × current_avg + received_qty × unit_price) / new_qty`
   - `reports:kpis` 庫存總值、毛利計算改用 `COALESCE(NULLIF(avg_cost, 0), buy_price)` 取代純 `buy_price`

9. **帳期管理欄位**：`purchase_orders` 與 `sales_orders` 透過 migration `013_payment_terms.sql` 新增兩個欄位：
   - `payment_due_date DATE NULL`：付款截止日，由使用者建立訂單或後續設定
   - `payment_status TEXT DEFAULT 'unpaid'`：付款狀態，限制為 `'unpaid' | 'paid' | 'overdue'`
   - `purchases:markPaid(id)` / `sales:markPaid(id)` IPC：更新 `payment_status = 'paid'`，僅限 `received` / `completed` 狀態的訂單
   - `reports:kpis` 新增 `unpaidPurchases`（應付）與 `unpaidSales`（應收）兩個 KPI：SQL 使用 `SUM(total_amount) WHERE payment_status = 'unpaid' AND status IN ('received'/'completed')`
   - 逾期判斷：`payment_due_date < date('now') AND payment_status = 'unpaid'`，UI 顯示紅色 `逾期` Badge，不自動更新 DB 欄位

10. **訂單折扣欄位 Migration（014_discount.sql）**：
    - 建立 `src/main/db/migrations/014_discount.sql`，內容：
      ```sql
      ALTER TABLE purchase_items ADD COLUMN discount_pct REAL NOT NULL DEFAULT 0;
      ALTER TABLE sale_items ADD COLUMN discount_pct REAL NOT NULL DEFAULT 0;
      ```
    - migration runner 在 `src/main/db/migrate.ts` 以 `CREATE TABLE IF NOT EXISTS migrations` + 逐一執行未執行的 `.sql` 檔案；新增 `014_discount.sql` 後 runner 自動執行
    - Model 層（`purchase.ts` / `sale.ts`）的 INSERT items SQL 需在 `discount_pct` 欄加入佔位符；SELECT items SQL 需 `SELECT ..., discount_pct FROM purchase_items/sale_items`
    - `total_amount` 計算改為：`SUM(unit_price * quantity * (1 - discount_pct / 100.0))` 作為訂單總額（可在 INSERT 時由前端計算好傳入，或在 DB 觸發）；實務上由前端計算後寫入 `total_amount`
    - 現有資料：`discount_pct DEFAULT 0` 確保歷史資料不受影響
