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
  overdue: boolean          // payment_due_date < today && payment_status = 'unpaid'
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
- 新增 `overdueCount`：`COUNT(*)` 從 sales_orders 和 purchase_orders 中 `payment_status='unpaid'` 且 `payment_due_date < date('now')`

### 三層同步
1. `src/main/ipc/reports.ipc.ts`：新增 `reports:getUnpaidOrders` handler
2. `src/preload/index.ts`：`reports.getUnpaidOrders()`
3. `src/renderer/src/types/global.d.ts`：`getUnpaidOrders(): Promise<{ sales: UnpaidOrder[], purchases: UnpaidOrder[] }>`

### UI 規格

#### 頁面佈局
- 頂部：Tab 切換「應收帳款」/「應付帳款」
- 各 Tab 顯示對應的 UnpaidOrder 列表

#### 表格欄位
| 欄位 | 說明 |
|------|------|
| 訂單號 | `order_no`，monospace |
| 客戶/供應商 | `party_name` |
| 訂單日期 | `order_date` |
| 付款期限 | `payment_due_date`，逾期顯示紅色 + 「逾期」badge |
| 金額 | `total_amount` |
| 操作 | 「標記已付」按鈕（BadgeCheck icon，綠色） |

#### 逾期樣式
- `overdue: true` → 整行 row `bg-red-500/5`，付款期限欄文字 `text-red-400`，Badge「逾期」紅色
- `payment_due_date` 為 null → 顯示「—」（無期限設定）

#### 空白狀態
- 若列表為空，顯示「目前無未付款帳款 🎉」

### DashboardKPIs 型別擴充
在 `src/renderer/src/types/schema.ts` 的 `DashboardKPIs` 加入：
```typescript
overdueCount: number
```
