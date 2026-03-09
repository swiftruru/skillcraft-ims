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

12. **商品進階篩選**：Products 頁面在搜尋框右側加入兩個下拉篩選器：
    - **分類篩選**：`useQuery(['products', 'categories'])` 取得所有分類；選項為「全部分類」+ 各分類名稱；value 存為 `category` state，傳入 `products:getAll({ category, search })`
    - **庫存狀態篩選**：固定選項「全部 / 低庫存 / 零庫存」；「低庫存」傳 `lowStock: true`，「零庫存」在 frontend filter（`stock_qty === 0`）；queryKey 加入 `{ category, stockFilter }` 以精確快取
    - 兩個篩選器使用 shadcn `<Select>`，`size="sm"` 樣式，寬度 `w-32`；任一條件非預設值時顯示「清除篩選」連結

13. **客戶/供應商詳情彈窗**：點擊客戶/供應商名稱開啟詳情 Dialog：
    - IPC：`customers:getOrders(id)` 回傳 `SalesOrder[]`（依 `created_at DESC` 最多 20 筆）；`suppliers:getOrders(id)` 回傳 `PurchaseOrder[]`
    - 彈窗上半部顯示聯絡資訊（name、contact、phone、email、address）
    - 統計列：客戶顯示「訂單數 / 完成數 / 累計消費」；供應商顯示「訂單數 / 收貨數 / 累計採購」
    - 下半部為訂單歷史表格：訂單號、日期、狀態 badge、金額；queryKey 為 `['customers', 'orders', id]` / `['suppliers', 'orders', id]`，`staleTime: 1000 * 60`
    - 元件命名 `CustomerDetailDialog` / `SupplierDetailDialog`，位於 `src/renderer/src/components/customers/` 和 `suppliers/`

14. **Dashboard 快速操作卡**：Dashboard 頂部（KPI Cards 之前）新增快速操作列：
    - 三個按鈕：「+ 新增採購單」、「+ 新增銷售單」、「開始盤點」
    - 使用 `useNavigate` 搭配 React Router state `{ openForm: true }` 跳轉目標頁面
    - 目標頁（Purchases、Sales、StockTake）在 `useEffect` 中讀取 `location.state?.openForm`，若為 true 則自動開啟新增表單，讀取後清除 history state
    - 快速操作列樣式：`flex gap-3 flex-wrap`，按鈕 `variant="outline" size="sm" gap-2`

15. **通知中心（Notification Bell）**：Header 右側新增鈴鐺圖示按鈕，點擊展開 popover 通知列表：
    - IPC：`notifications:getAll()` 回傳 `AppNotification[]`（`{ id, type, title, body, link?, read, created_at }`）；`notifications:markRead(id)` 標為已讀；`notifications:markAllRead()` 全部已讀
    - 通知由 main process 寫入 SQLite `app_notifications` 資料表，renderer 以 `useQuery(['notifications'], ..., { refetchInterval: 30000 })` 輪詢
    - 鈴鐺圖示顯示未讀數量 badge（紅色圓點，最多顯示「99+」）；無未讀時隱藏 badge
    - Popover 內顯示最新 10 筆，每筆有 icon（依 type：low_stock→AlertTriangle 黃、backup→HardDrive 藍）、title、body、時間
    - 每筆有「跳轉」功能（click 標記已讀並 navigate 到 link）；右上角「全部標為已讀」連結

16. **商品批次操作**：Products 表格支援勾選多筆並批次操作：
    - 資料行最左側加 Checkbox 欄（`key: '__check__'`）；表頭 Checkbox 可全選/全消
    - 選取 1 筆以上時底部浮現操作列（`fixed bottom-6 left-1/2 -translate-x-1/2`）：顯示「已選 N 項」+ 操作按鈕
    - 批次操作：「調整分類」（彈出 Select dialog）、「批次刪除」（ConfirmDialog）
    - 批次刪除呼叫 `products:batchDelete(ids[])` IPC；返回 `{ deleted: number; skipped: number }`（有庫存的商品 skip）
    - 操作後 invalidate `['products']`，清空選取集合

11. **側邊欄徽章（Sidebar Badge）**：Sidebar 以 `useQuery(['reports', 'kpis'], ..., { staleTime: 1000 * 60 * 2 })` 取得 KPI 數值，在特定導覽項目右側顯示計數徽章：
    - **商品** → 低庫存數量（`lowStockCount > 0` 時顯示，黃底褐字）
    - **採購** → 待處理採購單數（`pendingPurchasesCount > 0` 時顯示）
    - **銷售** → 待處理銷售單數（`pendingSalesOrders > 0` 時顯示）
    - 徽章直接追加在 label 右方：`<span className="ml-auto text-xs rounded-full px-1.5 py-0.5 ...">N</span>`
    - 徽章數值為 0 時不渲染，避免版面偏移；低庫存用 `bg-yellow-500/20 text-yellow-600`，待處理訂單用 `bg-primary/15 text-primary`

17. **盤點差異視覺化（StockTake Variance Chart）**：StockTake `DetailView` 已完成狀態時，在表格上方新增「差異分析」卡片：
    - 只在 `take.status === 'completed'` 且有差異商品時顯示
    - 使用 Recharts `BarChart layout="vertical"`，每商品顯示「帳面數量」（藍色 `#3b82f6`）與「實際盤點」（綠色 `#10b981`）兩條 Bar
    - 篩選條件：`item.counted_qty !== null && item.counted_qty !== item.system_qty`
    - 商品名稱顯示在 Y 軸（`YAxis dataKey="name" type="category"`），X 軸為數量
    - 無差異時不顯示此卡片；height 依差異數量動態計算（每項 40px，最少 200px，最多 400px）

18. **商品快速採購（Quick Purchase Dialog）**：Products 表格每行動作按鈕區新增「快速採購」按鈕（`ShoppingCart` icon）：
    - 元件命名 `QuickPurchaseDialog`，位於 `src/renderer/src/components/purchases/QuickPurchaseDialog.tsx`
    - Props：`product: Product | null, open: boolean, onOpenChange: (v: boolean) => void`
    - 表單欄位：供應商（Select，`suppliers:getAll()` 載入，可選「不指定」）、數量（預設 `Math.max(1, product.reorder_pt - product.stock_qty)`）、單價（預設 `product.buy_price`）
    - 送出呼叫 `purchases:create`，payload `{ supplier_id, order_date: today, notes: null, items: [{ product_id, quantity, unit_price }] }`
    - 成功後 `invalidate(['purchases'])` + toast success，關閉 dialog

19. **商品批次調整分類（Batch Category Update）**：Products 批次操作浮動列新增「調整分類」按鈕：
    - IPC：`products:batchUpdate(ids: number[], data: { category: string })` → `UPDATE products SET category=?, updated_at=datetime('now') WHERE id IN (...)`；回傳 `{ updated: number }`
    - 批次操作列點擊「調整分類」後，出現一個 inline 的 `<Select>` 讓使用者選擇現有分類，選擇後立即執行更新
    - 更新後 `invalidate(['products'])`，清空 `selectedIds`，顯示 toast success

20. **訂單複製（Clone Order）**：採購/銷售頁每筆訂單新增「複製」按鈕（`Copy` icon），點擊後以原始訂單為模板建立新訂單：
    - `PurchaseForm` / `SaleForm` 新增 `initialData?: Partial<FormValues>` prop
    - 當 `initialData` 改變且 `open` 為 true 時，`useEffect` 以 `reset(initialData)` 帶入數值；今天日期覆蓋原訂單日期
    - 頁面中：點擊複製 → `purchases:getById(id)` / `sales:getById(id)` 取得完整訂單（含 items）→ 組成 initialData → 開啟表單
    - 複製動作為 async，不需新 IPC，複用現有 `getById` + `create`

21. **採購/銷售日期區間篩選**：Purchases/Sales 搜尋欄右側加入「起始日」與「結束日」兩個 `<Input type="date">` 篩選：
    - 前端 state：`dateFrom` / `dateTo`（預設空字串）；任一設定後在查詢 queryKey 加入 `{ dateFrom, dateTo }`
    - IPC `purchases:getAll` / `sales:getAll` 新增 `dateFrom?: string; dateTo?: string` 參數，在 SQL `WHERE po.order_date >= ? AND po.order_date <= ?` 條件動態附加
    - 顯示「清除日期」連結（同商品清除篩選的設計）

22. **採購逾期警示（Overdue Alert）**：Purchases 列表中 `status='pending'` 且建立距今超過 30 天的採購單，在訂單號右側顯示橙色 badge「逾期 N 天」：
    - 純前端計算：`Math.floor((Date.now() - new Date(order.created_at).getTime()) / 86400000)`
    - 超過 30 天才顯示，badge 樣式：`text-xs px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400`
    - Dashboard 的「待處理採購」統計文字旁也顯示逾期筆數（若有）

23. **商品 SKU 自動產生**：ProductForm 的 SKU 欄位右側（新增模式）加入「自動產生」小按鈕（`Zap` icon）：
    - IPC：`products:nextSku(category: string)` → 查詢該分類所有 SKU，找出最大流水號，回傳 `PREFIX-XXXX` 格式
    - 分類前綴對應表：電子產品→`ELEC`、電腦周邊→`PERI`、文具→`STAT`、包裝材料→`PKG`、其他→`MISC`；不在表中的分類取前 4 字母大寫
    - 流水號為 4 位數字（0001 起），取同分類最大值 +1，首次為 0001
    - 點擊後以 mutation 呼叫 IPC，取回值後直接 `setValue('sku', result)` 填入欄位
