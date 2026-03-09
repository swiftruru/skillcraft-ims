---
name: ims-report
description: 當使用者要求新增或修改 Dashboard、KPI 卡片、圖表或報表頁面時觸發。
---

## 報表與 Dashboard 開發規範

1. **KPI 資料來源**：Dashboard 的 KPI 數值（庫存總值、本月營收、毛利率、低庫存數量）必須從 `reports:getSummary` IPC 取得，不在 renderer 自行計算，確保邏輯集中在 main process。

2. **圖表使用 Recharts**：所有圖表元件使用 `recharts`，BarChart 用於類別分佈，LineChart 用於銷售趨勢，統一使用 `ResponsiveContainer` 包裹以支援響應式寬度。

3. **金額格式化**：報表中顯示的金額字串前面必須加上 `NT$` 符號，並以千分位逗號格式化，使用專案的 `formatCurrency` 工具函式，不在元件內自行用 `toLocaleString`。

4. **低庫存警示**：低於補貨點的商品必須以視覺方式區分——`stock_qty === 0` 顯示紅色，`stock_qty < reorder_pt` 顯示黃色，使用 Tailwind 的 `text-destructive` 和 `text-yellow-600` class。

5. **查詢快取設定**：報表資料的 React Query 快取時間設為 `staleTime: 1000 * 60 * 5`（5 分鐘），避免每次切換頁面重複查詢，使用者可手動點擊重新整理。

6. **報表 queryKey 命名**：統一使用 `['reports', 'summary']`、`['reports', 'inventory']`、`['reports', 'sales', { days }]` 格式，便於精確 invalidate 特定報表而不影響其他查詢。

7. **毛利分析**：`reports:marginAnalysis` IPC 回傳 `MarginItem[]`；毛利率 ≥30% 顯示 `text-green-400`，10–30% 顯示 `text-yellow-400`，<10% 顯示 `text-destructive`；queryKey 為 `['reports', 'marginAnalysis']`。

8. **供應商/客戶統計**：`reports:supplierStats` 和 `reports:customerStats` 回傳各自的統計陣列；供應商顯示採購次數與收貨總金額；客戶顯示訂單次數與完成總金額；queryKey 分別為 `['reports', 'supplierStats']` 和 `['reports', 'customerStats']`。

10. **銷售業績排行（Top Customers）**：`reports:topCustomers` IPC 回傳 `TopCustomerItem[]`：
    - SQL：JOIN `sales_orders`（status IN completed/returned）+ `customers`，GROUP BY customer_id，SUM(total_amount) AS total_spent，COUNT(*) AS order_count
    - 回傳欄位：`customer_id, name, order_count, total_spent`，ORDER BY total_spent DESC LIMIT 10
    - queryKey：`['reports', 'topCustomers']`，`staleTime: 1000 * 60 * 5`
    - UI：Reports 頁面新增「銷售業績排行」卡片，以橫向 BarChart（Recharts `HorizontalBarChart` 或 `BarChart layout="vertical"`）呈現 top 5；卡片下方顯示完整 top 10 排名列表（名次、客戶名、訂單數、累計金額）

11. **月報 PDF 匯出**：`reports:exportMonthlyPdf` IPC 使用 Electron `BrowserWindow.loadURL` + `printToPDF` 產生月報：
    - 參數：`year: number, month: number`（預設當月）
    - 內容：月份標題、KPI 摘要（4 張卡片數值文字）、前 5 名商品、前 5 名客戶、低庫存清單
    - 使用現有 `print.ipc.ts` 的 HTML 模板模式，以 inline CSS 樣式化，不依賴 renderer CSS
    - 月報報表 HTML 產生邏輯放在 `src/main/ipc/print.ipc.ts`，新增 `type: 'monthly-report'` 分支
    - UI：Reports 頁面右上角「匯出月報 PDF」按鈕（`variant="outline" size="sm"`），點擊後跳出月份選擇（預設當月），確認後呼叫 IPC

12. **商品採購價格歷史**：`products:getPriceHistory(productId)` IPC 查詢該商品的所有採購記錄：
    - SQL：JOIN `purchase_items` + `purchase_orders`（status='received'），回傳 `{ order_date, order_no, unit_price, quantity }[]`，ORDER BY order_date DESC LIMIT 20
    - queryKey：`['products', 'priceHistory', productId]`，`staleTime: 1000 * 60 * 5`
    - UI：`ProductDetailDialog` 新增「採購價格」tab，以 LineChart 顯示歷史單價趨勢；下方表格列出每筆明細（日期、訂單號、數量、單價）
    - 無採購記錄時顯示空白提示

13. **採購 vs 銷售對比圖**：`reports:purchaseVsSales(days?)` IPC 回傳雙軸時序資料：
    - SQL：左聯接採購（`purchase_orders` status='received'）與銷售（`sales_orders` status='completed'），依日期 GROUP BY，回傳 `{ date, purchase_amount, sales_amount }[]`
    - 參數 `days` 預設 30，queryKey 為 `['reports', 'purchaseVsSales', days]`，`staleTime: 1000 * 60 * 5`
    - UI：Reports 頁面新增「採購 vs 銷售」卡片，使用 Recharts `BarChart`（groupped，兩條 Bar）；採購用 `#3b82f6`（藍），銷售用 `#10b981`（綠）；同一個期間選擇器控制 days
    - 無資料時顯示空白提示；type：`PurchaseVsSalesPoint { date: string; purchase_amount: number; sales_amount: number }`

9. **停滯品分析（Slow-Moving Inventory）**：`reports:slowMoving` IPC 接受 `days: 30 | 60 | 90` 參數，回傳 `SlowMovingItem[]`：
   - SQL 邏輯：`products.updated_at < date('now', '-N days') AND stock_qty > 0`（`updated_at` 隨每次庫存異動更新，可代表最後移動日）
   - 回傳欄位：`id, name, sku, category, stock_qty, buy_price, updated_at, days_idle, stock_value`
   - queryKey：`['reports', 'slowMoving', days]`，`staleTime: 1000 * 60 * 5`
   - UI 在 Reports 頁面以獨立卡片呈現；天數切換 30/60/90 按鈕（`variant="outline" size="sm"`）；顯示商品名稱、SKU、庫存、庫存價值、最後異動天數；天數越長顯示越深的警示色（30天→黃色，60天→橘色，90天→紅色）
