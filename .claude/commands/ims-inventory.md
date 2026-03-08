---
name: ims-inventory
description: 當使用者要求新增或修改進貨、銷售、庫存異動、庫存調整或訂單狀態變更的業務邏輯時觸發。
---

## 庫存業務邏輯規範

1. **庫存只能由系統自動更新**：`products.stock_qty` 禁止在商品編輯介面直接修改（編輯表單的 stock_qty 欄位必須設為 `disabled={isEdit}`），庫存只能透過以下三個操作異動：
   - 採購單狀態改為 `received` → `stock_qty += quantity`
   - 銷售單狀態改為 `completed` → `stock_qty -= quantity`
   - 手動調整（`products:adjust` IPC）→ `stock_qty += delta`（delta 為負值時代表出庫）

2. **進貨 Transaction 結構**：收貨操作必須在同一個 transaction 內完成三件事：
   ```
   UPDATE purchase_orders SET status='received', receive_date=今天 WHERE id=?
   UPDATE products SET stock_qty = stock_qty + ? WHERE id=? （每個品項）
   ```

3. **銷售 Transaction 結構**：完成銷售前必須逐一驗證每個品項庫存，全部通過才執行扣減：
   ```
   SELECT stock_qty FROM products WHERE id=?  → 確認 >= 銷售數量
   UPDATE sales_orders SET status='completed' WHERE id=?
   UPDATE products SET stock_qty = stock_qty - ? WHERE id=? （每個品項）
   ```
   任一商品庫存不足時 throw Error，transaction rollback，回傳明確錯誤訊息。

4. **訂單狀態不可逆**：`received` 和 `completed` 狀態不可改回 `pending`，UI 層不呈現回退按鈕，IPC handler 層也不處理此類請求。

5. **訂單金額計算**：`total_amount` 在建立訂單時計算並儲存（`SUM(quantity * unit_price)`），不在查詢時動態計算，確保歷史訂單金額不受價格變動影響。

6. **手動庫存調整規範**：手動調整庫存時必須在同一個 transaction 內完成兩件事，且須寫入 `inventory_adjustments` 記錄：

   ```sql
   UPDATE products SET stock_qty = ?, updated_at = ? WHERE id = ?
   INSERT INTO inventory_adjustments (product_id, delta, reason, note) VALUES (?, ?, ?, ?)
   ```

   - 出庫後庫存若 < 0，調整前必須 throw Error，不執行 transaction
   - `reason` 必填，從固定選單選取（盤點修正、損耗報廢、樣品出貨、退貨入庫、系統校正、其他）
   - UI 元件（`AdjustInventoryDialog`）使用 react-hook-form + zod 驗證，以紅色（出庫）/ 綠色（入庫）視覺區分方向
