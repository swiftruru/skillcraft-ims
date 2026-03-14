---
name: ims-credit-limit
description: 當使用者要求新增或修改客戶/供應商信用額度、授信上限警示或欠款追蹤功能時觸發。
---

## 信用額度規範

### 資料結構
- `customers.credit_limit REAL DEFAULT 0`：客戶授信上限，0 表示不限制
- `suppliers.credit_limit REAL DEFAULT 0`：供應商授信上限，0 表示不限制
- Migration 015 新增兩個欄位

### 計算邏輯
- **客戶已用額度**：`SUM(total_amount) FROM sales_orders WHERE customer_id=? AND payment_status='unpaid' AND status IN ('completed','partial_return')`
- **供應商已用額度**：`SUM(total_amount) FROM purchase_orders WHERE supplier_id=? AND payment_status='unpaid' AND status='received'`
- IPC：`customers:getOutstanding(id)` → `{ outstanding: number }`
- IPC：`suppliers:getOutstanding(id)` → `{ outstanding: number }`

### 警示規則
- `credit_limit === 0` → 不顯示任何警示（無限制）
- `outstanding >= credit_limit` → 紅色警示「超過信用額度」，禁止送出表單
- `outstanding >= credit_limit * 0.8` → 黃色警示「接近信用額度（已用 X%）」，允許送出

### UI 規格
#### 表單警示（SaleForm / PurchaseForm）
- 選擇客戶/供應商後，若有 credit_limit > 0，自動查詢 outstanding
- 在品項列表上方顯示一行 Alert：
  - 黃色：`⚠️ 已使用 NT$X / NT$Y（X%），接近信用上限`
  - 紅色：`🚫 已超過信用額度 NT$Y，無法建立訂單`
- 超過時 submit button disabled

#### 詳情頁（CustomerDetailDialog / SupplierDetailDialog）
- Stats 區塊增加一格「信用額度」
- 若 credit_limit > 0，顯示進度條：`used / credit_limit`，顏色依比例（<80% 綠、<100% 黃、>=100% 紅）

#### 列表頁（Customers / Suppliers）
- 表格新增「信用額度」欄位，顯示 `NT$X` 或 `—`（無限制）
- 編輯表單新增 credit_limit 欄位（Number input，label「信用額度」，placeholder「0 表示不限制」）

### 三層同步
新增的 IPC 方法必須同時出現在：
1. `customers.ipc.ts` / `suppliers.ipc.ts`
2. `src/preload/index.ts`
3. `src/renderer/src/types/global.d.ts`
