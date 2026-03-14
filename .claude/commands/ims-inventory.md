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

11. **採購退貨規範**：`purchases:return` IPC 只接受 `received` 狀態的採購單，在同一個 transaction 內完成：
    ```
    UPDATE purchase_orders SET status='returned' WHERE id=? AND status='received'
    UPDATE products SET stock_qty = stock_qty - ?, updated_at=datetime('now') WHERE id=?  （每個品項，delta 為負值）
    INSERT INTO inventory_adjustments (product_id, delta, reason, note) VALUES (?, ?, '採購退貨', '採購退貨 #{order_no}')
    ```
    - 退貨後若任一商品 stock_qty < 0，transaction rollback 並回傳明確錯誤訊息
    - `returned` 狀態為終態，不可再次操作；IPC 層驗證 status='received' 才執行，否則 throw Error
    - UI 只在 received 訂單列表中顯示「退貨」按鈕（橘色 Undo2 icon），點擊後彈出 ConfirmDialog
    - 完成後 invalidate `['purchases']`、`['products']`、`['reports']`、`['adjustments']` query cache
    - `PurchaseOrder.status` type 更新為 `'pending' | 'received' | 'cancelled' | 'returned'`

12. **訂單備注全文搜尋規範**：採購單與銷售單的搜尋 SQL 必須同時比對 `order_no`、供應商/客戶名稱 **以及** `notes` 欄位：
    ```sql
    -- 採購單搜尋
    WHERE (p.order_no LIKE ? OR s.name LIKE ? OR p.notes LIKE ?)
    -- 銷售單搜尋
    WHERE (so.order_no LIKE ? OR c.name LIKE ? OR so.notes LIKE ?)
    ```
    - `notes` 欄位在 `purchase_orders` 和 `sales_orders` 表皆為 `TEXT NULL`
    - UI 搜尋框 placeholder 補充「訂單號 / 對象名稱 / 備注」提示文字
    - 查詢參數統一以 `%${search}%` 模糊匹配，三個佔位符傳同一個值

13. **採購收貨品項比對 Dialog**：`purchases:receive` 前彈出品項確認 Dialog，逐列顯示每個品項以供收貨確認：
    - 觸發：採購列表中「收貨」按鈕改為先呼叫 `purchases:getById(id)` 展開品項，再開啟 ReceiveDialog
    - Dialog 顯示：商品名稱、SKU、訂購數量（`quantity`）、實際收貨數量（可編輯 `<Input type="number">`，預設等於訂購數量）
    - IPC 擴充：`purchases:receive` 接受可選的 `actualQty?: { productId: number; qty: number }[]`；若提供，以 actualQty 更新庫存而非 quantity（允許部分收貨）
    - 確認後才呼叫 IPC，取消則不執行；Dialog 元件命名 `ReceivePurchaseDialog`，位於 `src/renderer/src/components/purchases/`

15. **帳期管理規範**：`purchase_orders` 與 `sales_orders` 透過 migration `013_payment_terms.sql` 新增 `payment_due_date DATE NULL` 與 `payment_status TEXT DEFAULT 'unpaid'`：
    - 付款狀態值：`'unpaid'`（未付）、`'paid'`（已付）、`'overdue'`（逾期，前端判斷，不存 DB）
    - `purchases:markPaid(id)` / `sales:markPaid(id)` IPC：`UPDATE SET payment_status='paid'`，僅限已收貨/已完成訂單，否則 throw Error
    - `PurchaseOrder` / `SalesOrder` type 補充 `payment_due_date: string | null` 與 `payment_status: 'unpaid' | 'paid'`
    - UI 顯示規則：
      - `payment_status === 'paid'` → 綠色「已付款」Badge
      - `payment_due_date < today && payment_status === 'unpaid'` → 紅色「逾期」Badge（前端計算）
      - 其他未付 → 灰色「未付款」Badge
    - 採購/銷售表單（`PurchaseForm` / `SaleForm`）新增可選「付款截止日」`<Input type="date">`
    - 完成 markPaid 後 invalidate `['purchases']` / `['sales']` 和 `['reports']`

16. **批次商品價格調整規範**：`products:batchUpdatePrice` IPC 接受陣列參數一次更新多筆商品價格：
    - 簽名：`products:batchUpdatePrice(updates: { id: number; sell_price?: number; buy_price?: number }[])`
    - 在單一 transaction 內逐筆 `UPDATE products SET sell_price=?, buy_price=?, updated_at=datetime('now') WHERE id=?`
    - UI：`Products` 頁面多選後工具列出現「調整價格」按鈕（`DollarSign` icon），開啟 `BatchPriceDialog`
    - `BatchPriceDialog` 規格：
      - 模式切換：「固定金額調整」（±N 元）或「百分比調整」（±N%）
      - 對象切換：「售價」、「進價」或「兩者」
      - 預覽表格：顯示選中商品的目前價格 → 調整後價格（負值變更用紅色標示）
      - 確認後呼叫 IPC，成功後 invalidate `['products']` 和 `['reports']` query cache

14. **銷售退貨規範**：`sales:return` IPC 只接受 `completed` 狀態的訂單，在同一個 transaction 內完成：
    ```
    UPDATE sales_orders SET status='returned' WHERE id=? AND status='completed'
    UPDATE products SET stock_qty = stock_qty + ?, updated_at=datetime('now') WHERE id=?  （每個品項）
    INSERT INTO inventory_adjustments (product_id, delta, reason, note) VALUES (?, ?, '退貨入庫', '銷售退貨 #{order_no}')
    ```
    - `returned` 狀態為終態，不可再次退貨；IPC 層驗證 status='completed' 才執行，否則 throw Error
    - UI 只在 completed 訂單列表中顯示「退貨」按鈕，點擊後彈出 ConfirmDialog 確認
    - 完成後 invalidate `['sales']`、`['products']`、`['reports']`、`['adjustments']` query cache
    - PDF 狀態標籤補充 'returned' → '已退貨'（橘色背景）；`SalesOrder.status` type 更新為 `'pending' | 'completed' | 'cancelled' | 'returned'`
