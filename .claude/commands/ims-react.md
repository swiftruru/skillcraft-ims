---
name: ims-react
description: 當使用者要求新增或修改 React 元件、頁面、表單或資料查詢邏輯時觸發。
---

## React 開發規範

1. **資料查詢使用 React Query**：所有從 IPC 讀取資料的邏輯必須使用 `useQuery`，queryKey 格式為 `['domain']`（如 `['products']`、`['suppliers']`），禁止在元件內直接 `useEffect` + `useState` 自行管理 fetch 狀態。

2. **資料變更使用 useMutation**：新增、更新、刪除操作必須使用 `useMutation`，`onSuccess` 時呼叫 `queryClient.invalidateQueries` 使相關查詢重新整理。

3. **表單驗證規範**：所有表單必須使用 `react-hook-form` + `zodResolver`，schema 定義在元件頂部（`const schema = z.object({...})`），禁止用 `useState` 手動管理表單欄位。

4. **UI 元件來源**：按鈕、輸入框、下拉選單、對話框等 UI 元件優先使用 `src/renderer/src/components/ui/` 下的 shadcn/ui 元件，不自行用 `<div>` 刻基礎元件。

5. **全域狀態使用 Zustand**：跨元件共享的非伺服器狀態（如選取的商品 ID、側欄開關）放在 `src/renderer/src/stores/`，不用 prop drilling 或 React Context 傳遞。

6. **Select 元件整合**：使用 shadcn `<Select>` 時，因其不支援原生 `register`，必須用 `watch` + `setValue` 整合 react-hook-form：
   ```tsx
   <Select value={watch('field')} onValueChange={(v) => setValue('field', v)}>
   ```

7. **深淺色主題切換**：
   - CSS token：`:root` 定義亮色，`.dark` 覆寫為深色；所有顏色 token 必須在兩個 block 都宣告。
   - 狀態儲存：使用 Zustand store（`src/renderer/src/stores/theme.store.ts`），`persist` middleware 寫入 `localStorage`，key 為 `'ims-theme'`。
   - 初始化：App 啟動時讀取 store 並同步 `document.documentElement.classList`（`'dark'` 或移除）。
   - 切換觸發：`toggleTheme()` 同時更新 store 和 DOM class，不得僅更新其中一個。
   - 切換按鈕：放在 `Header` 右側，使用 `Sun` / `Moon` icon，`variant="ghost" size="icon"`。

8. **Toast 通知**：操作成功/失敗使用 toast 通知。import `useToast` from `@/components/ui/use-toast`；success 用 `toast({ title: '...', variant: 'success' })`；error 用 `toast({ title: '...', variant: 'destructive' })`。Toaster 元件已在 Layout 中掛載，不要重複掛載。

9. **鍵盤快捷鍵面板**：`?` 鍵開啟 ShortcutOverlay，`Esc` 關閉；target 為 input/textarea/select 時忽略按鍵；
   - 元件位於 `src/renderer/src/components/layout/ShortcutOverlay.tsx`，在 Layout 掛載（不在每個頁面重複掛載）
   - 不使用 Dialog，改用 `fixed inset-0 z-50` + `backdrop-blur-sm bg-background/80` backdrop
   - 快捷鍵列表以 `grid grid-cols-2 gap-2` 排列，每項顯示 label + `<kbd>` badge（`font-mono text-xs border rounded px-1.5`）
   - 已知快捷鍵：`⌘K` 全域搜尋、`?` 快捷鍵說明、`Esc` 關閉、`N` 新增採購單（在 /purchases 頁）、`N` 新增銷售單（在 /sales 頁）
   - open state 使用 Zustand store（`ui.store.ts`）的 `shortcutOpen` 欄位
   - **G+key 路由導覽**：Layout keydown handler 支援兩鍵序列（`G` 後接指定鍵），用 `gMode: boolean` state 記錄等待第二鍵狀態，超過 1500ms 自動重置；對應路由：`G+H` → `/`、`G+P` → `/products`、`G+B` → `/purchases`、`G+S` → `/sales`、`G+R` → `/reports`、`G+,` → `/settings`；target 為 input/textarea/select 時忽略

10. **DataTable 分頁**：DataTable 支援 `pageSize` prop（預設 15）；分頁狀態為元件內部 `useState(1)`；排序欄位變更時重置到第 1 頁；分頁列顯示「第 X / Y 頁」與上一頁／下一頁按鈕（`variant="outline" size="sm"`）；資料總筆數 ≤ pageSize 時不顯示分頁列。

100. **Purchases/Sales 可展開列（Expandable Rows）**：
    - `DataTable` 新增 `expandable?: boolean` + `renderExpanded?: (row: T) => React.ReactNode` props
    - 當 `expandable` 為 `true` 時，每列最左側加展開箭頭欄（`ChevronRight` → `ChevronDown`，`w-8`，不可排序/隱藏）
    - 點擊箭頭切換展開狀態（`expandedIds: Set<key>` state，key 為列的 `id` 欄位）；再次點擊收合
    - 展開時在 `<tr>` 下方插入 `<tr>` 跨所有欄（`colSpan={columns.length + 1}`），渲染 `renderExpanded(row)` 回傳內容
    - 展開資料以 `useQuery` 懶載入（`enabled: expandedIds.has(id)`），queryKey `['purchases', 'items', id]` / `['sales', 'items', id]`，呼叫 `purchases:getById(id)` / `sales:getById(id)`
    - 展開內容：小型表格顯示訂單 items（商品名、SKU、數量、單價、小計），使用 `text-sm p-3 bg-muted/30` 樣式
    - `Purchases.tsx` 與 `Sales.tsx` 傳入 `expandable={true}` + `renderExpanded` prop

101. **Products 庫存進度條（Stock Level Bar）**：
    - Products 表格「庫存數量」欄位下方加 `h-1 rounded-full` 進度條
    - 計算：`ratio = stock_qty / reorder_pt`（`reorder_pt = 0` 時不顯示進度條）
    - 顏色與寬度：`ratio < 0.5`→`bg-red-400`（緊急）；`0.5 ≤ ratio < 1.0`→`bg-orange-400`（警示）；`ratio ≥ 1.0`→不顯示（不渲染進度條元素）
    - 進度條容器 `w-full bg-muted/30 rounded-full h-1`，內部 bar 寬度 `style={{ width: \`${Math.min(ratio * 100, 100)}%\` }}`
    - 純前端計算，不需新 IPC；庫存欄 cell 改為 `<div className="flex flex-col gap-0.5">` 包裹數字 + 進度條

102. **KPI 卡片點擊跳轉（KPI Click-Through）**：
    - Dashboard `KpiCard` 元件（或直接在各 KPI 卡片 `<Card>`）加 `onClick?: () => void` prop
    - `onClick` 有值時卡片加上 `cursor-pointer hover:ring-2 ring-primary/20 transition-shadow` 樣式
    - 跳轉對應：
      - 低庫存卡片 → `navigate('/products?stockFilter=low_stock')`
      - 待處理採購 → `navigate('/purchases?status=pending')`
      - 待處理銷售 → `navigate('/sales?status=pending')`
    - 使用 `useNavigate`；不需 React Router state，直接用 URL params
    - 目標頁（Products、Purchases、Sales）已整合 `useSearchParams`，URL param 會自動套用篩選

103. **報表分項 CSV 匯出（Section Export）**：
    - Reports 各分析 Card 右上角加 `Download` icon 按鈕（`variant="ghost" size="icon" className="h-7 w-7"`）
    - 純前端 Blob + `<a>` 下載，不新增 IPC（複用 Rule 68 的 CSV 序列化 + Blob 下載模式）
    - CSV 序列化：BOM（`\uFEFF`）+ 標頭列 + 資料列，`escapeCell` 邏輯同 main process
    - 適用分析區塊：低庫存表、毛利分析、供應商統計、客戶統計、ABC 分析、存貨周轉
    - 各區塊預設檔名：`skillcraft-report-{section}-{YYYY-MM-DD}.csv`
    - 下載觸發：`const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)`

104. **Products 批次補貨點設定（Bulk Reorder Point）**：
    - Products 批次操作浮動列（已有「調整分類」、「調整價格」、「批次刪除」）新增「設定補貨點」按鈕（`Target` icon）
    - 點擊後在浮動列原地顯示一個 inline input 區塊：`<Input type="number" min="0" className="w-24 h-8 text-sm" placeholder="補貨點" />` + 確認按鈕
    - 確認後呼叫 `products:batchUpdate(ids: number[], data: { reorder_pt: number })` IPC
    - SQL：`UPDATE products SET reorder_pt=?, updated_at=datetime('now') WHERE id IN (...)`，用 `db.transaction` 包裹
    - 成功後 `queryClient.invalidateQueries({ queryKey: ['products'] })`，清空 selectedIds，toast success「已更新 N 項補貨點」
    - i18n key：`products.batchSetReorderPt`（「設定補貨點」）

105. **訂單折扣欄位（Order Line Discount）**：
    - DB migration `014_discount.sql`：`ALTER TABLE purchase_items ADD COLUMN discount_pct REAL NOT NULL DEFAULT 0; ALTER TABLE sale_items ADD COLUMN discount_pct REAL NOT NULL DEFAULT 0;`
    - 計算邏輯：`subtotal = unit_price * quantity * (1 - discount_pct / 100)`；所有訂單金額 (`total_amount`) 計算需使用折扣後小計之和
    - `schema.ts` 的 `PurchaseItem` / `SaleItem` 加 `discount_pct: number`
    - `PurchaseForm` / `SaleForm` items 列 grid 改為 `grid-cols-[2fr_auto_1fr_0.6fr_auto_auto]`，在 unit_price 後加「折扣%」欄：
      - `<Input type="number" min="0" max="100" step="0.5" className="w-16 text-right" placeholder="0" />`，右側顯示 `<span className="text-xs text-muted-foreground">%</span>`
      - 預設 0（無折扣）
    - items 行右側「小計」顯示：折扣 > 0 時，上方用 `line-through text-muted-foreground text-xs` 顯示原價，下方顯示折後價
    - Detail Dialog（PurchaseDetailDialog / SaleDetailDialog）items 表格加「折扣」欄，顯示 `N%` 或 `—`（0% 時顯示 `—`）；小計欄顯示折後金額
    - IPC `purchases:create` / `purchases:update` / `sales:create` / `sales:update` 的 item payload 加 `discount_pct?: number`（default 0），INSERT 時帶入
    - i18n key：`orders.discount`（「折扣」）、`orders.discountPct`（「折扣 %」）

106. **對帳單 Tab（Account Statement）**：
    - `CustomerDetailDialog` 與 `SupplierDetailDialog` 新增「對帳單」Tab（使用 shadcn `Tabs` 元件，`FileText` icon + label 「對帳單」）
    - Tab 內容頂部：兩個 `<Input type="date">` 篩選（`dateFrom` / `dateTo`），預設為當月 1 號到今天
    - IPC `customers:getStatement(id: number, dateFrom: string, dateTo: string)` → `{ orders: SalesOrder[]; totalAmount: number; paidAmount: number; balance: number }`
      - SQL：`SELECT * FROM sales_orders WHERE customer_id=? AND order_date BETWEEN ? AND ? ORDER BY order_date DESC`
      - `paidAmount = SUM(total_amount) WHERE payment_status='paid'`
      - `balance = totalAmount - paidAmount`
    - IPC `suppliers:getStatement(id: number, dateFrom: string, dateTo: string)` → `{ orders: PurchaseOrder[]; totalAmount: number; paidAmount: number; balance: number }`
    - 表格欄位（小型，`text-sm`）：訂單號 / 日期 / 狀態 badge / 付款 badge / 金額（`text-right`）
    - 表格下方統計列（`text-xs text-muted-foreground flex gap-4 mt-2`）：`共 N 筆 · 總金額 NT$X · 已付 NT$Y · 未付 NT$Z`
    - queryKey：`['customers', 'statement', id, dateFrom, dateTo]` / `['suppliers', 'statement', id, dateFrom, dateTo]`，`staleTime: 1000 * 60`
    - 「未付」金額 > 0 時，未付數字顯示 `text-destructive`
