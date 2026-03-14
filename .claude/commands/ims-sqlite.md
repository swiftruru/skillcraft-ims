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
