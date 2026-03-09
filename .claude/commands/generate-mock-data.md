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

interface MockDataResult {
  success: boolean
  counts: {
    suppliers: number
    customers: number
    products: number
    purchaseOrders: number
    salesOrders: number
    adjustments: number
  }
  error?: string
}
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

#### 商品類別與 SKU 前綴
| 類別 | SKU前綴 | 數量占比 |
|------|---------|---------|
| 電子產品 | ELEC | 25% |
| 電腦周邊 | PERI | 20% |
| 文具 | STAT | 20% |
| 包裝材料 | PKG | 15% |
| 辦公用品 | OFFI | 20% |

#### 採購單數量
- S: 40筆, M: 80筆, L: 150筆
- 狀態分布：60% received, 25% pending, 10% cancelled, 5% returned
- 時間分布：過去 90 天，近 30 天佔比較高（加權隨機）

#### 銷售單數量
- S: 80筆, M: 160筆, L: 300筆
- 狀態分布：70% completed, 20% pending, 7% cancelled, 3% returned
- 時間分布：同採購單，近 30 天佔比較高

#### 庫存情境
- `normal`: stock_qty = reorder_pt * (3 ~ 10 倍)
- `warning`: 70% 正常，30% stock_qty = reorder_pt * (0.3 ~ 0.9)
- `empty`: 60% 正常，20% stock_qty = reorder_pt * (0.3 ~ 0.9)，20% stock_qty = 0

#### 時間分布演算法（近期偏重）
```typescript
function randomDateWithBias(daysBack: number): string {
  // 指數分布，近期機率較高
  const u = Math.random()
  const days = Math.floor(-Math.log(1 - u * (1 - Math.exp(-daysBack/20))) * 20)
  const d = new Date()
  d.setDate(d.getDate() - Math.min(days, daysBack))
  d.setHours(Math.floor(Math.random() * 10) + 8)  // 8am ~ 6pm
  d.setMinutes(Math.floor(Math.random() * 60))
  return d.toISOString().slice(0, 16).replace('T', ' ')
}
```

### UI 設計（Settings 頁面）

新增「Demo 資料產生」Card（加在 Data Management Card 上方）：
- 規模選擇：3 個 Radio/Button（S / M / L）
- 情境選擇：3 個 Button（正常庫存 / 低庫存警示 / 偶有缺貨）
- 說明文字：顯示預估產生的資料筆數
- 「產生 Demo 資料」按鈕：destructive 紅色邊框（強調會清除現有資料）
- Loading 狀態：顯示 Spinner + "正在產生 Demo 資料..."
- 成功後顯示各表筆數摘要（綠色）

### 驗證與後續

寫入完成後回傳各表筆數，UI 顯示摘要。
提示使用者可接著執行 `/inventory-report`、`/reorder-alert`、`/sales-analysis`。
