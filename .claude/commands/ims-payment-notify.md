---
name: ims-payment-notify
description: 當使用者要求新增或修改帳期到期提醒、逾期通知或付款狀態提示功能時觸發。
---

## 帳期提醒通知規範

### 觸發時機
帳期到期通知在 App 啟動時（`mainWindow.on('ready-to-show')`）自動執行一次，由 `checkPaymentDueNotifications()` 函式處理。

### 通知分類與規則
1. **逾期未付**：`payment_due_date < date('now') AND payment_status = 'unpaid'`
   - OS 通知 title：`⚠️ 帳款逾期提醒`
   - 應用內 type：`'payment_overdue'`
   - link：`/purchases` 或 `/sales`

2. **今日到期**：`payment_due_date = date('now') AND payment_status = 'unpaid'`
   - OS 通知 title：`🔔 帳款今日到期`
   - 應用內 type：`'payment_due_today'`

3. **明日到期**：`payment_due_date = date('now', '+1 day') AND payment_status = 'unpaid'`
   - OS 通知 title：`📅 帳款明日到期`
   - 應用內 type：`'payment_due_soon'`

### 實作位置
- **函式**：`src/main/index.ts` 的 `checkPaymentDueNotifications()`
- **呼叫點**：`mainWindow.on('ready-to-show', () => { checkLowStockNotification(); checkPaymentDueNotifications() })`
- **資料查詢**：直接使用 `getDb()` 查詢 `purchase_orders` 和 `sales_orders`

### 查詢結構
```sql
-- 採購單帳款（逾期 / 今日 / 明日）
SELECT order_no, payment_due_date, total_amount
FROM purchase_orders
WHERE payment_status = 'unpaid'
  AND payment_due_date IS NOT NULL
  AND payment_due_date <= date('now', '+1 day')
  AND status = 'received'

-- 銷售單帳款（同上，status = 'completed'）
SELECT order_no, payment_due_date, total_amount
FROM sales_orders
WHERE payment_status = 'unpaid'
  AND payment_due_date IS NOT NULL
  AND payment_due_date <= date('now', '+1 day')
  AND status = 'completed'
```

### 應用內通知去重規則
- 同一訂單號的通知不重複寫入（判斷 `body LIKE '%{order_no}%'` 且 `created_at >= date('now')`）
- 每次啟動最多寫入 10 筆應用內通知（逾期優先）

### OS 通知格式
- 逾期：列出前 3 筆逾期訂單號，超過 3 筆加「…等 N 筆」
- 今日/明日到期：合併一則通知，body 說明幾筆採購/幾筆銷售

### 前端顯示補充
- Dashboard 的應收/應付 KPI 卡片已顯示未付款總額
- 逾期的 Badge 在前端計算：`payment_due_date < today && payment_status === 'unpaid'` → 紅色「逾期」
- 通知中心（bell icon）已有 `app_notifications` 顯示邏輯，通知寫入後自動出現

## 建立訂單時設定帳期天數

### 表單欄位

- `payment_terms`：`z.coerce.number().int().min(0).optional()`，預設 `0`
- Label：「帳期天數」，Placeholder：「0 表示不設定期限」
- 放置位置：`order_date` 欄旁邊（grid cols-3 或獨立行）

### 計算邏輯（前端送出前）

```typescript
const paymentDueDate = data.payment_terms && data.payment_terms > 0
  ? new Date(new Date(data.order_date).getTime() + data.payment_terms * 86400000)
      .toISOString().slice(0, 10)
  : null
```

### Model 支援

- `SaleModel.create()` 接受 `payment_due_date?: string | null`，寫入 `INSERT` SQL
- `PurchaseModel.create()` 同上
- `SalesOrderCreate` / `PurchaseOrderCreate` 型別加入 `payment_due_date?: string | null`

### 不需要新 Migration

`payment_due_date` 欄位已由 Migration 013 建立。
