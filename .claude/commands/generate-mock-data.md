---
name: generate-mock-data
description: 當使用者要求產生測試資料、填充範例資料或壓力測試系統時觸發。
---

## Mock 資料生成規範（In-App 版本）

本功能透過 Electron IPC 在 app 內部直接產生 Mock 資料，不需要外部 script。

### 架構說明

- **IPC Handler**：`src/main/ipc/mockdata.ipc.ts` 負責所有資料生成邏輯
- **IPC 通道**：`mockdata:generate(options)` → 接受規模與情境參數
- **Preload Bridge**：`window.electronAPI.mockData.generate(options)`
- **UI 入口**：`src/renderer/src/pages/Settings.tsx` 中的「Demo 資料產生」Card

### 參數規格

```typescript
interface MockDataOptions {
  scale: 'S' | 'M' | 'L'   // S=30商品, M=60商品(預設), L=100商品
  scenario: 'normal' | 'warning' | 'empty'
  // normal: 所有庫存正常
  // warning: 約 30% 商品低於補貨點
  // empty: 約 20% 商品庫存歸零、20% 低庫存
}
```

### 資料欄位完整性要求

所有 INSERT 必須包含最新欄位，勿省略：

#### suppliers / customers
- `credit_limit REAL DEFAULT 0`：約 40% 的供應商/客戶設定非零信用額度（範圍：5000～200000）

#### purchase_orders
- `payment_status TEXT DEFAULT 'unpaid'`：received 訂單依規則設定
- `payment_due_date TEXT`：received 訂單中設定帳期天數（30/45/60 天）

#### sales_orders
- `payment_status TEXT DEFAULT 'unpaid'`：completed 訂單依規則設定
- `payment_due_date TEXT`：completed 訂單中設定帳期天數

### 帳款狀態分配規則（確保警示功能可見）

#### 必須生成的特殊情境訂單
| 類型 | 筆數 | 說明 |
|------|------|------|
| 逾期未付（銷售） | 3–5 筆 | `payment_due_date < today`，`payment_status = 'unpaid'` |
| 逾期未付（採購） | 2–3 筆 | 同上 |
| 7天內到期（銷售）| 2–3 筆 | `payment_due_date BETWEEN today AND today+7d` |
| 7天內到期（採購）| 1–2 筆 | 同上 |
| 今日到期 | 1 筆 | `payment_due_date = today` |
| 已付款 | ~50% received/completed 訂單 | `payment_status = 'paid'` |

#### 一般訂單帳期設定
- 60% 的 received/completed 訂單設定 `payment_due_date`（帳期 30/45/60 天隨機）
- 其中 50% 標記為 `paid`（訂單較舊的優先付款）
- 剩餘未付款訂單中：5–8 筆設定為過期、3–5 筆設定為 7 天內到期

### 信用額度設定

```typescript
// 供應商：40% 設定信用額度
const creditLimitAmounts = [50000, 100000, 150000, 200000, 0, 0, 0]  // 0 = 不限制
// 客戶：30% 設定信用額度
const customerCreditAmounts = [30000, 50000, 80000, 100000, 0, 0, 0, 0, 0, 0]
```

### 資料清除順序（清除前備份 DB）

```typescript
// 依外鍵依賴順序刪除
db.exec(`
  DELETE FROM stock_take_items;
  DELETE FROM stock_takes;
  DELETE FROM inventory_adjustments;
  DELETE FROM sale_items;
  DELETE FROM sales_orders;
  DELETE FROM purchase_items;
  DELETE FROM purchase_orders;
  DELETE FROM products;
  DELETE FROM customers;
  DELETE FROM suppliers;
`)
```

### 資料生成規格

#### 供應商（8 家）
台灣電子供應商、鴻鑫科技、捷騰資訊、大統辦公用品、永豐包裝材料、聯發文具行、星海電腦、承恩五金

#### 客戶（12 家，混合企業與個人）
企業：台積電採購部、鴻海科技採購處、遠傳電信、統一超商、誠品文化...
個人：陳大明、林小花、王建志...

#### 訂單數量
- S: 採購 40筆, 銷售 80筆
- M: 採購 80筆, 銷售 160筆
- L: 採購 150筆, 銷售 300筆

#### 訂單狀態分布
- 採購：60% received, 25% pending, 10% cancelled, 5% returned
- 銷售：65% completed, 5% partial_return, 20% pending, 7% cancelled, 3% returned

#### 庫存情境
- `normal`: stock_qty = reorder_pt * (3 ~ 10 倍)
- `warning`: 70% 正常，30% stock_qty = reorder_pt * (0.3 ~ 0.9)
- `empty`: 60% 正常，20% stock_qty = reorder_pt * (0.3 ~ 0.9)，20% stock_qty = 0

### UI 設計（Settings 頁面）

新增「Demo 資料產生」Card：
- 規模選擇：3 個 Radio/Button（S / M / L）
- 情境選擇：3 個 Button（正常庫存 / 低庫存警示 / 偶有缺貨）
- 「產生 Demo 資料」按鈕：destructive 紅色邊框
- Loading 狀態：Spinner + "正在產生 Demo 資料..."
- 成功後顯示各表筆數摘要
