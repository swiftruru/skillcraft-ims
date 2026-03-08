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

7. **庫存調整歷史查詢規範**：調整歷史透過 `products:getAdjustmentHistory` IPC 查詢，以 Dialog 形式呈現在商品頁：
   - 每筆記錄顯示：日期時間、delta（正數加庫存 / 負數減庫存）、reason、note
   - delta > 0 顯示綠色 `+N`，delta < 0 顯示紅色 `N`
   - 依 `adjusted_at DESC` 排序，最多顯示 50 筆
   - 使用 `useQuery(['products', 'adjustments', productId])` 快取，productId 為 key 的一部分

8. **採購建議規範**：`inventory:getPurchaseSuggestions` IPC 回傳低於補貨點商品的建議採購量：
   - 建議採購量 = `MAX(reorder_pt * 2 - stock_qty, reorder_pt)` — 補到補貨點的兩倍，至少補一個補貨點
   - 必須同時回傳 `product_id, sku, name, stock_qty, reorder_pt, suggested_qty, buy_price, estimated_cost`
   - UI 以表格呈現，每列可勾選，底部「建立採購單」按鈕觸發 `purchases:create`
   - 建立採購單後 invalidate `['purchases']` 和 `['reports']` query cache

9. **庫存盤點規範**：`stock_takes` 為盤點單（status: draft/completed），`stock_take_items` 為每商品的盤點項目（`system_qty` 為建立時的庫存快照，`counted_qty` 為實際盤點數量）。
   - `stocktake:create` 建立草稿時快照所有商品的 `stock_qty`；`stocktake:updateItem` 更新 counted_qty；`stocktake:complete` 在 transaction 內對每個 diff != 0 的品項產生 `inventory_adjustments`（reason = '盤點修正'），並將 status 改為 completed。
   - 只有 draft 狀態的盤點單可編輯和刪除；completed 為唯讀。
   - UI：list/detail 兩種 view state 在同一頁；detail 顯示商品名稱、SKU、系統庫存、實際數量（input）、差異（diff > 0 綠色、< 0 紅色、= 0 灰色、未填 `-`）；底部顯示「已盤 X / 共 Y 項」和「完成盤點」按鈕。

10. **庫存異動歷史頁面規範**：獨立頁面 `/inventory-history`，顯示所有 `inventory_adjustments` 記錄：
    - IPC：`products:getAllAdjustments({ search?, reason?, limit? })` → JOIN products，回傳含 `product_name`, `sku`
    - 欄位：日期時間、商品名稱、SKU、類別、delta（`+N` 綠色 / `-N` 紅色）、原因、備註
    - 篩選：reason 下拉（全部 / 盤點修正 / 損耗報廢 / 手動調整 …）+ 商品名稱/SKU 搜尋
    - 匯出：右上角「匯出 CSV」按鈕呼叫既有 `export:adjustments` IPC
    - 預設顯示最新 200 筆，`adjusted_at DESC`
