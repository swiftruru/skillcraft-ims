---
name: ims-receivables
description: 當使用者要求新增或修改帳款管理、應收帳款、應付帳款或逾期追蹤頁面時觸發。
---

## 帳款管理頁面規範

### 路由
- 路徑：`/receivables`
- 頁面檔：`src/renderer/src/pages/Receivables.tsx`
- 在 App.tsx 的 `<Routes>` 中加入 `<Route path="/receivables" element={<Receivables />} />`

### Sidebar 導航
- Icon：`Wallet`（lucide-react）
- 位置：在 `/customers` 之後
- Badge：`kpis.overdueCount`（逾期筆數），樣式 `bg-red-500/20 text-red-500`
- 翻譯 key：`t.nav.receivables`（中：帳款管理 / 英：Receivables）

### IPC 規格
#### `reports:getUnpaidOrders` → `{ sales: UnpaidOrder[], purchases: UnpaidOrder[] }`
```typescript
interface UnpaidOrder {
  id: number
  order_no: string
  party_name: string        // customer_name 或 supplier_name
  order_date: string
  payment_due_date: string | null
  total_amount: number
  payment_status: string
  overdue: number           // 1 = 逾期（payment_due_date < today），0 = 未逾期
}
```

SQL（sales）：
```sql
SELECT so.id, so.order_no,
       COALESCE(c.name, '散客') as party_name,
       so.order_date, so.payment_due_date, so.total_amount, so.payment_status,
       CASE WHEN so.payment_due_date < date('now') THEN 1 ELSE 0 END as overdue
FROM sales_orders so
LEFT JOIN customers c ON so.customer_id = c.id
WHERE so.status IN ('completed', 'partial_return') AND so.payment_status = 'unpaid'
ORDER BY so.payment_due_date ASC NULLS LAST, so.order_date DESC
```

SQL（purchases）：同上，`purchase_orders` + `suppliers`，`status = 'received'`

#### `reports:kpis` 擴充
- `overdueCount`：`COUNT(*)` 從 sales_orders 和 purchase_orders 中 `payment_status='unpaid'` 且 `payment_due_date < date('now')`
- `dueSoonCount`：7天內即將到期，`payment_due_date BETWEEN date('now') AND date('now','+7 days')` 且 `payment_status='unpaid'`

### 三層同步
1. `src/main/ipc/reports.ipc.ts`：新增 `reports:getUnpaidOrders` handler
2. `src/preload/index.ts`：`reports.getUnpaidOrders()`
3. `src/renderer/src/types/global.d.ts`：`getUnpaidOrders(): Promise<{ sales: UnpaidOrder[], purchases: UnpaidOrder[] }>`

### UI 規格

#### 頁面佈局
- 頂部：Tab 切換「應收帳款」/「應付帳款」
- Tab 下方：帳款老化分析指標卡（未到期 / 逾期1–30天 / 31–60天 / >60天）
- 各 Tab 顯示對應的 UnpaidOrder 列表

#### 表格欄位
| 欄位 | 說明 |
|------|------|
| 訂單號 | `order_no`，monospace |
| 客戶/供應商 | `party_name` |
| 訂單日期 | `order_date` |
| 付款期限 | `payment_due_date`，逾期顯示紅色 + 「逾期」badge；7天內到期顯示黃色 + 「即將到期」badge |
| 金額 | `total_amount` |
| 操作 | 「標記已付」按鈕（BadgeCheck icon，綠色） |

#### 逾期樣式
- `overdue: 1` → 整行 row `bg-red-500/5`，付款期限欄文字 `text-red-400`，Badge「逾期」紅色
- 7天內到期（非逾期）→ `text-amber-400`，Badge「即將到期」黃色
- `payment_due_date` 為 null → 顯示「—」（無期限設定）

#### 空白狀態
- 若列表為空，顯示「目前無未付款帳款 🎉」

### 即將到期提醒（Dashboard）
- 在 Dashboard 逾期警示卡下方，若 `dueSoonCount > 0` 顯示黃色警示卡
- 標題：「即將到期提醒」，副標題：`共 N 筆帳款將於 7 天內到期`
- 列出最多 5 筆即將到期帳款（來自 `unpaidOrders` 中 `!overdue && daysUntilDue <= 7`）

### Detail Dialog 快速標記付款
#### SaleDetail.tsx
- 訂單為 `completed` 或 `partial_return` 且 `payment_status = 'unpaid'` 時，在 DialogFooter 顯示「標記已付款」按鈕（variant="outline"，BadgeCheck icon，綠色）
- 點擊後呼叫 `window.electronAPI.sales.markPaid(order.id)`，成功後 invalidate `['sales', id]` 和 `['reports']`
- 使用 `useMutation` + 確認彈窗（`ConfirmDialog`）

#### PurchaseDetail.tsx
- 訂單為 `received` 且 `payment_status = 'unpaid'` 時，在 DialogFooter 顯示「標記已付款」按鈕
- 點擊後呼叫 `window.electronAPI.purchases.markPaid(order.id)`

### DashboardKPIs 型別擴充
在 `src/renderer/src/types/schema.ts` 的 `DashboardKPIs` 加入：
```typescript
overdueCount: number
dueSoonCount: number
```
