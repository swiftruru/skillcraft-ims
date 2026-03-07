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
