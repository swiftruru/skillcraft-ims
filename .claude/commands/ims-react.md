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

24. **商品圖片上傳與縮圖**：Products 表格與 ProductForm 支援每個商品附加一張圖片：
    - **ProductForm**（編輯模式）：表單頂部或 SKU 欄旁顯示圖片區塊（80×80px `object-cover rounded-lg border`），無圖時顯示 `Package` icon 佔位符；點擊區塊觸發隱藏的 `<input type="file" accept="image/*">`
    - **圖片壓縮**：選擇後以 Canvas API 縮放至最大 400×400，再以 `toDataURL('image/jpeg', 0.8)` 轉 base64，呼叫 `products:setImage(id, base64)` 儲存；顯示新圖片前用 `URL.createObjectURL` 做本地預覽
    - **清除圖片**：圖片區塊 hover 時右上角顯示 ✕ 按鈕，點擊後呼叫 `products:setImage(id, null)` 清除
    - **新增模式不支援圖片**：`ProductForm` 新增模式隱藏圖片欄位，提示「儲存後可在編輯模式上傳圖片」
    - **Products 表格縮圖**：商品名稱欄左側加 32×32px 縮圖（`object-cover rounded`）；以 `useQuery(['products', 'image', id])` 懶載入，`enabled` 為 `true`；無圖時顯示灰色 `Package` icon 佔位；縮圖不影響列高（`shrink-0`）
    - **i18n**：不新增 i18n key，直接用固定中文文字「點擊上傳圖片」、「已選擇，儲存中...」


25. **批次價格調整（BatchPriceDialog）**：Products 頁面多選商品後，批次工具列出現「調整價格」按鈕（`DollarSign` icon），開啟 `BatchPriceDialog`：
    - 元件位於 `src/renderer/src/components/products/BatchPriceDialog.tsx`
    - 表單欄位（react-hook-form + zod）：
      - `mode`: `'fixed'`（±N 元）或 `'percent'`（±N%），Radio Group 切換
      - `target`: `'sell'`、`'buy'` 或 `'both'`，Radio Group 切換
      - `amount`: number（正數為加價，負數為降價）
    - 預覽表格：列出選中商品目前售價/進價 → 調整後預覽值；調整後 < 0 顯示 `text-destructive`
    - 確認後呼叫 `products:batchUpdatePrice(updates[])` IPC，成功後 toast 提示「已調整 N 項商品價格」，invalidate `['products']` 和 `['reports']`，清空選取集合，關閉 Dialog
    - IPC `products:batchUpdatePrice` 在單一 transaction 內逐筆 UPDATE，signature：`{ id, sell_price?, buy_price? }[]`

26. **表單離開警示（Unsaved Changes Guard）**：
    - 適用範圍：`PurchaseForm`、`SaleForm`（及所有含複雜欄位的 Dialog 表單）
    - 判斷依據：`formState.isDirty`（react-hook-form 內建）；`isDirty` 為 `true` 表示使用者已修改過欄位
    - 攔截時機：Dialog 的 `onOpenChange(false)` 被呼叫時（點擊關閉按鈕、點擊外部遮罩、按 Esc）
    - 實作方式：在 `PurchaseForm` / `SaleForm` 元件內部維護 `confirmLeave` state；
      攔截 `onOpenChange` 的關閉動作，若 `isDirty` 為 `true` 則只設 `confirmLeave = true`，
      不直接關閉；確認對話框確認後才呼叫真正的 `onOpenChange(false)` 並 `reset()`
    - 確認 Dialog 使用 shadcn `AlertDialog`，標題「確定要離開嗎？」，
      描述「表單已有變更，離開後將會遺失。」，
      取消按鈕「繼續編輯」（`variant="outline"`），確認按鈕「捨棄變更」（`variant="destructive"`）
    - 初始開啟表單或 `reset()` 後，`isDirty` 自動歸 `false`，不觸發警示
    - i18n keys（新增至 `translations.ts`）：
      `unsavedChanges.title`、`unsavedChanges.desc`、
      `unsavedChanges.discard`、`unsavedChanges.keepEditing`

27. **Inline 快速新增 Combobox**：
    - 適用範圍：`PurchaseForm` 的供應商欄位、`SaleForm` 的客戶欄位
    - 元件命名：`CreatableSelect`，位於 `src/renderer/src/components/ui/CreatableSelect.tsx`
    - Props 介面：
      ```tsx
      interface CreatableSelectProps {
        options: { value: string; label: string }[]
        value: string
        onValueChange: (value: string) => void
        placeholder?: string
        createLabel?: (input: string) => string  // 預設: (v) => `新增「${v}」`
        onCreate: (name: string) => Promise<string> // 回傳新建立的 id（字串）
      }
      ```
    - 互動流程：
      1. 顯示為一個 `<Input>` + 下方 dropdown（`absolute z-50 w-full`）
      2. 聚焦時展開，顯示所有符合輸入文字的選項（`includes` 不分大小寫）
      3. 清單最底部顯示「新增「XXX」為供應商/客戶」選項（`Plus` icon，主色文字）
         僅在輸入文字不完全符合任一現有選項時出現
      4. 點擊新增選項 → 呼叫 `onCreate(inputText)` → 取得新 id → 呼叫 `onValueChange(newId)`
         → 更新顯示文字為新名稱 → 關閉 dropdown
      5. 點擊現有選項 → `onValueChange(option.value)` → 更新顯示文字 → 關閉 dropdown
      6. 點擊外部或按 `Esc` → 關閉 dropdown，若有已選值則復原顯示文字
    - 建立動作呼叫對應 IPC：
      - 供應商：`suppliers:create({ name, contact: '', phone: '', email: '', address: '' })`
      - 客戶：`customers:create({ name, contact: '', phone: '', email: '', address: '' })`
      建立成功後需 `queryClient.invalidateQueries({ queryKey: ['suppliers', 'all'] })`
      / `['customers', 'all']`
    - `onCreate` 期間顯示 loading spinner，禁止重複提交
    - 整合 react-hook-form：用 `watch` + `setValue` 替換原本的 `<Select>`

28. **EmptyState 元件與 DataTable 整合**：
    - 元件命名：`EmptyState`，位於 `src/renderer/src/components/common/EmptyState.tsx`
    - Props：`{ icon: React.ElementType, title: string, description?: string, action?: { label: string, onClick: () => void } }`
    - 樣式：`flex flex-col items-center justify-center py-16 gap-3`；icon 64×64 `text-muted-foreground/30`；title `text-base font-medium`；description `text-sm text-muted-foreground`；action Button `variant="default" size="sm" mt-1`
    - `DataTable` 新增 `emptyState?: React.ReactNode` prop；當 `data.length === 0` 且 `emptyState` 有值時渲染 `emptyState`，否則渲染原本的 `emptyMessage` 文字
    - 使用時機區分：
      - 無任何篩選且資料空 → 傳 `emptyState`（含 CTA 按鈕）
      - 有篩選但無結果 → 傳 `emptyMessage` 文字即可（不傳 `emptyState`）
    - 各頁面 CTA 按鈕動作：Products → `setFormOpen(true)`；Purchases → `setFormOpen(true)`；Sales → `setFormOpen(true)`

29. **DataTable 欄位顯示/隱藏**：
    - `DataTable` 新增 `storageKey?: string` 與 `Column.hideable?: boolean` 欄位屬性
    - 當 `storageKey` 有值時，右上角顯示「欄位」按鈕（`Settings2` icon，`variant="ghost" size="sm"`）；點擊開啟 Popover（`absolute right-0 top-full mt-1 z-50`）
    - Popover 內列出所有 `hideable: true` 的欄位，以 Checkbox 切換顯示/隱藏
    - 隱藏狀態存 `localStorage[storageKey]`（JSON string array of hidden column keys）
    - 至少保留 1 個可見欄位（若全部打勾隱藏，最後一個不允許隱藏）
    - `storageKey` 命名慣例：`'dt-vis-{pageName}'`，如 `'dt-vis-products'`、`'dt-vis-purchases'`

30. **可儲存的篩選條件（Saved Filters）**：
    - 適用範圍：Purchases、Sales 頁面
    - 篩選欄位：`{ search, dateFrom, dateTo }`（與現有 state 對應）
    - 儲存位置：`localStorage['ims-saved-filters-purchases']` / `['ims-saved-filters-sales']`，JSON array of `{ name: string, filters: object }`，上限 5 組
    - UI：篩選列最右側加書籤 icon 按鈕（`Bookmark`），點擊後顯示 inline input 讓使用者輸入名稱，按 Enter 或點儲存確認
    - 已存的篩選組合顯示為頁面頂部的 badge chips（`bg-muted rounded-full px-2.5 py-0.5 text-xs`），點擊 chip → 套用對應篩選值，chip 右側 `×` → 刪除
    - 如果目前篩選條件已有同名存檔，書籤 icon 顯示 filled 狀態（`fill-current`）

31. **商品銷售效能排行（Top Products）**：
    - Dashboard 新增「銷售排行」卡片，緊接在 KPI 卡片之後
    - IPC：`reports:topProducts(days)` 已存在，回傳 `{ product_id, sku, name, category, total_quantity, total_revenue }[]`（ORDER BY total_revenue DESC LIMIT 10）
    - queryKey：`['reports', 'topProducts', days]`，`staleTime: 1000 * 60 * 5`
    - 時間區間切換：3 個 Button（30天 / 90天 / 180天），state `[days, setDays] = useState(30)`；切換時 refetch
    - 圖表：Recharts `BarChart layout="vertical"`，X 軸為金額（`formatCurrency`），Y 軸為商品名稱（`name`），最多顯示前 5 名；Bar 顏色使用 `CATEGORY_COLORS` 依 index 循環
    - 圖表下方排名列表：依序顯示排名 badge（圓形 `bg-muted`）、商品名、銷售量、銷售金額
    - 空白狀態（無資料）顯示「所選期間尚無銷售紀錄」
    - i18n keys：`dashboard.topProducts`（卡片標題）、`dashboard.topProductsDays(n)`（「過去 N 天」）、`dashboard.noSalesData`（空白提示）

32. **Products 列右鍵選單（Row Context Menu）**：
    - Products 頁面表格每一列（`<tr>`）加上 `onContextMenu` 事件
    - 右鍵後在游標位置顯示 context menu（`fixed`，`z-50`，`bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px]`）
    - 選單項目（對應現有功能）：
      - 「編輯商品」（`Edit2` icon） → `setEditProduct(row); setFormOpen(true)`
      - 「調整庫存」（`SlidersHorizontal` icon） → `setAdjustProduct(row)`
      - 「快速採購」（`ShoppingCart` icon） → `setQuickPurchaseProduct(row)`
      - 「查看記錄」（`History` icon） → `setDetailProduct(row)`
      - 分隔線
      - 「刪除商品」（`Trash2` icon，`text-destructive`） → `setDeleteId(row.id)`
    - State：`contextMenu: { x, y, product } | null`，點擊外部或選擇項目後清除
    - 關閉邏輯：`useEffect` 監聽全域 `click` 事件，觸發時呼叫 `setContextMenu(null)`
    - 元件不拆出，直接在 `Products.tsx` 內以 `portal` 或 `fixed` div 實作

33. **Dashboard 小工具顯示/隱藏自訂**：
    - Dashboard header 右上角新增「自訂」按鈕（`LayoutDashboard` icon，`variant="ghost" size="sm"`），點擊切換「編輯模式」
    - 編輯模式下，每個 widget 卡片右上角顯示 Eye / EyeOff toggle 按鈕（`opacity-0 group-hover:opacity-100` + 編輯模式強制顯示）
    - 各 widget 對應 key（用於 localStorage）：`kpis`、`quickActions`、`salesTrend`、`topProducts`、`inventoryByCategory`、`lowStock`、`pendingSales`、`unpaidOrders`、`purchaseSuggestions`、`aiInsight`
    - 設定儲存於 `localStorage['ims-dashboard-hidden']`（JSON string array of hidden widget keys）
    - 所有 widget 預設顯示（hidden 列表為空）；僅最後 1 個不允許隱藏（至少保留 1 個）
    - i18n key：`dashboard.customize`（按鈕文字）、`dashboard.editingMode`（提示文字）

34. **刪除操作 Undo（Soft Delete Toast）**：
    - 適用範圍：Products、Purchases、Sales、Customers、Suppliers 的刪除操作
    - 實作模式：刪除確認後不立即呼叫 IPC，而是先執行 IPC 刪除，成功後顯示含「復原」按鈕的 Toast；按復原時呼叫對應還原 IPC（若無還原 IPC，改為先軟刪除再還原）
    - **簡化版實作**（不需軟刪除）：刪除成功 Toast 中顯示「復原」按鈕，點擊後呼叫 `xxx:create(deletedData)` 重新建立（Products 適用，id 會不同）
    - Toast 樣式：`variant="default"`，title 為「已刪除 [名稱]」，`action` 使用 shadcn `ToastAction`（`altText="復原"` 顯示「復原」），自動關閉時間 5 秒（shadcn Toast 預設即 5 秒）
    - `useToast` 的 `toast()` return 值含 `dismiss`；復原按鈕點擊後先 `dismiss()` 再執行復原
    - Products：保存刪除前資料（`productToDelete`），復原呼叫 `products:create(savedData)` 並 invalidate；不保留 id
    - i18n keys：`common.deleted(name)`（「已刪除 {name}」）、`common.undo`（「復原」）

35. **Products 網格/卡片視圖**：
    - Products 頁面篩選列最右側新增視圖切換按鈕組（`LayoutGrid` / `Table2` icon，`variant="ghost" size="icon"`，active 狀態 `bg-muted`）
    - 視圖偏好存 `localStorage['ims-products-view']`（`'table'` 或 `'grid'`），預設 `'table'`
    - Grid 視圖：`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3`，每張卡片顯示：
      - 縮圖（80×80px，無圖顯示 Package icon，`bg-muted/40 rounded-lg`）
      - 商品名稱（`text-sm font-medium truncate`）
      - SKU（`text-xs text-muted-foreground`）
      - 庫存數量（低庫存顯示橙色，`flex items-center gap-1`）
      - 售價（`text-sm font-semibold`）
      - 右下角動作：Edit / ShoppingCart icon 按鈕（`opacity-0 group-hover:opacity-100`）
    - 卡片整體可點擊（`onClick` → `setDetailProduct(row)`）
    - Grid 視圖不顯示 DataTable，不影響選取/批次操作邏輯

36. **DataTable 排序狀態記憶**：
    - `DataTable` 的 `storageKey` prop 同時用於儲存排序偏好（與欄位顯示共用同一 key 空間）
    - 排序狀態存 `localStorage['dt-sort-${storageKey}']`，格式：`{ key: string, dir: 'asc' | 'desc' } | null`
    - DataTable 初始化時讀取存檔排序，初始 `sortKey`/`sortDir` 以 stored value 優先
    - 每次排序變更（點擊欄標題）同步寫入 localStorage
    - 若 stored key 已不存在於當前 columns（欄位被移除），忽略存檔值，以預設排序啟動

37. **Purchases / Sales 批次操作**：
    - 兩頁面表格最左側加 Checkbox 欄（`key: '__check__'`，`width: 40`，`hideable: false`）
    - 表頭 Checkbox：全選/全消，`indeterminate` 狀態（部分選取時顯示）
    - 選取 1 筆以上時底部浮現操作列（`fixed bottom-6 left-1/2 -translate-x-1/2 z-40`，`bg-card border rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-3`）
    - 操作列顯示：「已選 N 筆」+ 批次標記付款（Purchases: 標記「已收貨」、Sales: 標記「已付款」）+ 取消選取
    - Purchases 批次標記：`purchases:batchUpdateStatus(ids[], 'received')` → invalidate `['purchases']`
    - Sales 批次標記：`sales:batchUpdatePayment(ids[], 'paid')` → invalidate `['sales']`
    - 操作後清空選取集合，顯示 toast success
    - i18n keys：`purchases.batchMarkReceived`（「標記已收貨」）、`sales.batchMarkPaid`（「標記已付款」）

38. **Products Inline 快速編輯（售價 / 庫存）**：
    - Products 表格的「售價」和「庫存數量」欄位，單擊即進入 inline 編輯（`<input type="number">`），不需開啟 Dialog
    - 觸發方式：欄位渲染時以 `editingCell: { id, field } | null` state 判斷是否顯示 input；`onClick` 設定 `editingCell`
    - Input 樣式：`h-7 w-20 text-right text-sm px-2 border rounded focus:ring-1 focus:ring-ring bg-background`
    - 確認方式：`onBlur` 或 `Enter` 鍵 → 呼叫對應 IPC 更新 → invalidate `['products']`；`Escape` → 取消（清除 `editingCell`）
    - 售價更新：`products:update(id, { sell_price: newValue })`；庫存更新：`products:update(id, { stock_qty: newValue })`
    - 合法性：值 < 0 時不允許（input `min="0"`）；空白視為取消（不送出）
    - 欄位 hover 時顯示 `Pencil` icon 提示（`opacity-0 group-hover:opacity-60`）

39. **Command Palette 搜尋結果文字高亮**：
    - 搜尋結果列表中，將符合 `query` 字串的文字片段以 `<mark>` 標籤包裹，樣式 `bg-primary/20 text-foreground rounded-sm not-italic`
    - 實作：建立 `highlight(text: string, query: string): React.ReactNode` 純函式（位於 CommandPalette 元件內或 `src/renderer/src/lib/highlight.ts`）
      - 用 `query.trim()` 比對，不分大小寫（`toLowerCase()`）
      - 找到所有匹配位置，切成 `before / match / after` 片段，map 成 `[text, <mark>match</mark>, text, ...]`
      - 無匹配時直接回傳原字串（不需 `<mark>`）
    - 套用範圍：搜尋結果的 `title`（商品名 / 訂單號 / 客戶名）；`subtitle` 不高亮
    - 只在 `query.trim()` 非空時啟用高亮；結果為空（`results.length === 0`）時不需高亮

40. **Customers / Suppliers 刪除 Undo**：
    - 與 Products 相同的 Undo Toast 模式（Rule 34）：刪除後顯示含「復原」按鈕的 5 秒 Toast
    - Customers：`pendingDelete: { id: number; snapshot: Customer } | null` state；復原呼叫 `customers:create(snapshot)` + invalidate `['customers']`
    - Suppliers：`pendingDelete: { id: number; snapshot: Supplier } | null` state；復原呼叫 `suppliers:create(snapshot)` + invalidate `['suppliers']`
    - Toast title：`已刪除「{name}」`；action label：`復原`；duration：5000ms
    - 刪除 mutation 的 `mutationFn` 改為接受 `{ id, snapshot }` 物件，`onSuccess` 中呼叫 toast + dismiss pattern

41. **URL 篩選條件同步（URL Search Params）**：
    - 適用範圍：Products、Purchases、Sales 頁面的篩選 state（Products: `search`, `categoryFilter`, `stockFilter`；Purchases/Sales: `search`, `dateFrom`, `dateTo`）
    - 使用 `useSearchParams` hook（React Router v6）讀寫 URL query string
    - 初始化：從 `searchParams.get('search')` 等讀取初始值，`useState` 的 initializer 改為從 URL 讀取（fallback 到預設值）
    - 更新：每次 state 變更後呼叫 `setSearchParams`（合併更新），空值用 `searchParams.delete(key)` 移除
    - 清除篩選時同步清除 URL params；使用 `replace: true` 避免堆疊 history

42. **表單草稿自動儲存（Auto-save Draft）**：
    - 適用範圍：`PurchaseForm`、`SaleForm`
    - localStorage key：`'ims-draft-purchase'`、`'ims-draft-sale'`
    - 存檔時機：`watch()` 監聽整個表單，`useEffect` 在值變更時（debounce 500ms）寫入 localStorage；表單 `isDirty` 為 true 且有至少一個 item 才存草稿
    - 恢復時機：Dialog 開啟（`open = true`）且不是編輯模式（無 initialData）時，若 localStorage 有草稿，顯示 inline banner（`bg-muted/50 rounded-lg p-2 text-xs flex items-center gap-2`）提示「找到未送出草稿」，附「恢復」和「忽略」按鈕
    - 恢復：點擊「恢復」呼叫 `reset(savedDraft)`；忽略：刪除 localStorage key
    - 清除：表單成功送出（`onSuccess`）後刪除 localStorage key；關閉 Dialog 且 `isDirty = false` 時也清除

43. **Dashboard 小工具拖曳排序**：
    - 使用 HTML5 原生 drag & drop API（`draggable`、`onDragStart`、`onDragOver`、`onDrop`），不引入額外套件
    - `widgetOrder: string[]` state（`WIDGET_KEYS` 順序的陣列），初始從 `localStorage['ims-dashboard-order']` 讀取，fallback 為 `WIDGET_KEYS` 預設順序
    - 編輯模式（`customizing = true`）下，每個 widget 左側顯示 `GripVertical` icon（`cursor-grab`）
    - `dragOver` 時計算目標位置，重新排列 `widgetOrder`（immutable swap）；`onDrop` 結束後寫入 localStorage
    - Widget 渲染改為依 `widgetOrder` 迭代，`wrap()` 函式不變；隱藏的 widget 在排序陣列中保留位置（只是不顯示）

44. **報表頁面數據匯出**：
    - Reports 頁面右上角加入「匯出報表」Button（`Download` icon，`variant="outline" size="sm"`）
    - IPC：`reports:exportSummary(params)` → 回傳 CSV 檔案路徑或觸發下載
    - 匯出內容：目前 KPI 卡片數值（本月營收、採購、毛利、訂單數等）+ Top Products 列表（10 筆）+ 銷售趨勢（30 天）
    - IPC 實作：組合 SQL 查詢結果，以 `\n` 分隔不同區塊，複用現有 `export.ts` 的 `writeCsv` helper
    - 複用現有 `electronAPI.export.*` 模式：ipc handler 在 `reports.ipc.ts`，export helper 在 `src/main/export/`
    - 匯出完成後顯示 toast success（`已匯出報表`）

45. **Skeleton Loading UI**：
    - 建立 `Skeleton` 基礎元件（`src/renderer/src/components/ui/skeleton.tsx`）：`<div className={cn("animate-pulse rounded-md bg-muted", className)} />`
    - 建立頁面專用 Skeleton 元件：
      - `TableSkeleton`（`src/renderer/src/components/common/TableSkeleton.tsx`）：rows prop（預設 8），每行顯示 `cols` 個 `<Skeleton>`，模擬表格外觀；第一欄較寬（`w-40`），其餘欄位隨機寬度（`w-24`/`w-32`），列高 `h-4`
      - `CardSkeleton`（`src/renderer/src/components/common/CardSkeleton.tsx`）：模擬 KPI 卡片，包含標題骨架（`h-4 w-24`）+ 數值骨架（`h-8 w-32`）+ 趨勢骨架（`h-3 w-16`）
    - 套用範圍：Products、Purchases、Sales、Customers、Suppliers 的主資料表格，以 `TableSkeleton` 取代現有 `<LoadingSpinner />`；Dashboard KPI 卡片以 `CardSkeleton` 取代
    - `TableSkeleton` props：`rows?: number`（預設 8）、`cols?: number`（預設 5）

46. **DataTable 鍵盤導航**：
    - `DataTable` 新增 `onRowFocus?: (row: T) => void` prop
    - 表格容器加上 `tabIndex={0}` + `onKeyDown` handler
    - 維護 `focusedIdx: number` state（-1 表示未聚焦）
    - Arrow Up/Down：移動 focusedIdx（不超出邊界）；捲動確保 focused 列可見（`scrollIntoView({ block: 'nearest' })`）
    - Enter：呼叫 `onRowFocus(rows[focusedIdx])`；Space：若有 checkbox 欄則切換選取狀態（呼叫現有 onCheck 邏輯）
    - 聚焦列以 `ring-1 ring-ring` 高亮（使用 `data-focused` attribute + CSS）
    - Home/End：跳到第一/最後列
    - 套用範圍：Products、Purchases、Sales、Customers、Suppliers 的 DataTable，`onRowFocus` 分別對應各頁面的 setDetailProduct / setDetailOrder 等 detail dialog

47. **搜尋框最近搜尋記錄**：
    - 建立 `RecentSearches` hook（`src/renderer/src/lib/useRecentSearches.ts`）：
      - `storageKey` 參數，localStorage 存 JSON string array，最多 8 筆，最新的放最前
      - 回傳 `{ recentSearches: string[], addSearch: (q: string) => void, clearAll: () => void, removeOne: (q: string) => void }`
      - `addSearch`：trim 後若非空且不重複則 unshift，超過 8 筆 pop 最舊
    - 在 Products、Purchases、Sales、Customers、Suppliers 的搜尋框加入下拉提示：
      - 搜尋框聚焦（`onFocus`）且搜尋值為空時，顯示最近搜尋 dropdown（`absolute z-20 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg py-1`）
      - 每筆顯示 `History` icon + 文字 + `×` 刪除按鈕；右上角「清除全部」連結
      - 點擊某筆 → 填入搜尋框並觸發搜尋
      - 用戶按 Enter 提交搜尋時呼叫 `addSearch(search)`；搜尋值為空時不記錄
      - 點擊外部（`onBlur` with delay 150ms）關閉 dropdown
    - Command Palette 最近動作：搜尋框為空時，顯示最近 5 筆操作記錄（`localStorage['ims-recent-actions']`），格式 `{ title, subtitle, icon, action }`；執行任何 Palette 動作時記錄到此 list

48. **成功操作動畫回饋**：
    - 建立 `useSuccessFlash` hook（`src/renderer/src/lib/useSuccessFlash.ts`）：
      - 回傳 `{ flashId: number | null, triggerFlash: (id: number) => void }`
      - `triggerFlash(id)` 設定 `flashId = id`，500ms 後自動清除
    - `DataTable` 新增 `flashRowId?: number | string | null` prop
    - 當某列的 key 值 === `flashRowId` 時，該列加上 `animate-flash` CSS 動畫（`bg-green-500/10 → transparent`，duration 500ms）
    - 在 `index.css`（或 global CSS）加入 keyframes：
      ```css
      @keyframes flash { 0% { background-color: hsl(var(--success)/0.2); } 100% { background-color: transparent; } }
      .animate-flash { animation: flash 0.5s ease-out forwards; }
      ```
    - 套用範圍：Products（create/update 成功後 flash 對應列）、Customers、Suppliers（同上）
    - Mutation `onSuccess` 中取得新建/更新的 `id` → 呼叫 `triggerFlash(id)`

49. **DataTable 密度切換**：
    - `DataTable` 新增 `density?: 'compact' | 'normal' | 'relaxed'` prop（預設 `'normal'`）
    - 行高對應：compact → `py-1 text-xs`、normal → `py-2.5 text-sm`、relaxed → `py-4 text-sm`
    - 各頁面在篩選列右側加入密度切換按鈕組（3 個小圖示按鈕，`AlignJustify` / `List` / `LayoutList` icon，`variant="ghost" size="icon"`，active 狀態 `bg-muted`）
    - 密度偏好存 `localStorage['ims-dt-density-{page}']`，讀取初始值；各頁面獨立設定
    - 切換密度時同步更新 DataTable props；不影響現有功能

50. **訂單狀態變更時間軸**：
    - 適用範圍：採購單詳情（`PurchaseDetailDialog`）與銷售單詳情（`SaleDetailDialog`）
    - IPC：`purchases:getStatusHistory(orderId)` / `sales:getStatusHistory(orderId)` → 回傳 `{ id, order_id, from_status, to_status, changed_at, note }[]`
    - DB：新增 `purchase_status_history` / `sale_status_history` 資料表（`id INTEGER PK, order_id INTEGER, from_status TEXT, to_status TEXT, changed_at DATETIME DEFAULT CURRENT_TIMESTAMP, note TEXT`）；在現有 IPC 的 updateStatus 呼叫後 INSERT 一筆紀錄（使用 DB transaction）
    - UI：在 DetailDialog 下方新增「狀態紀錄」區塊，使用垂直時間軸（`relative before:absolute before:left-3 before:top-0 before:bottom-0 before:w-px before:bg-border`）
    - 每個時間點顯示：狀態 badge（沿用現有 `getStatusBadge` / `getPaymentBadge`）、日期時間（`text-xs text-muted-foreground`）、備註（若有）
    - 最新狀態在頂部（DESC 排序）；第一筆永遠是「建立訂單」（`from_status: null, to_status: 'pending'`）
    - queryKey：`['purchases', 'history', id]` / `['sales', 'history', id]`，`staleTime: 1000 * 60`

51. **日期範圍快選按鈕（Date Range Presets）**：
    - 適用範圍：Purchases、Sales 頁面的日期篩選區
    - 在現有 `dateFrom` / `dateTo` `<Input type="date">` 旁邊新增快選 Chip 列（`flex gap-1.5 flex-wrap`）
    - 快選選項：`[{ label: '今天', days: 0 }, { label: '本週', days: 7 }, { label: '本月', days: 30 }, { label: '上月', offsetMonth: -1 }, { label: '近90天', days: 90 }]`
    - 點擊 Chip → 計算對應 `dateFrom`/`dateTo` 並呼叫 `setSearchParams`（合併更新）
    - Chip 樣式：`text-xs px-2.5 py-0.5 rounded-full border border-border bg-muted/40 hover:bg-muted cursor-pointer transition-colors`；目前選中的 Chip（dateFrom/dateTo 完全匹配）加上 `bg-primary/15 text-primary border-primary/30`
    - 「本月」：`dateFrom = startOfMonth(today)`、`dateTo = today`；「上月」：前一個月 1 號到最後一天；「今天」：`dateFrom = dateTo = today`
    - 日期格式：`YYYY-MM-DD`（ISO 字串，直接用 `new Date().toISOString().slice(0, 10)` 計算）
    - 再次點擊已選 Chip → 清除 `dateFrom`/`dateTo`（相當於清除日期篩選）

52. **資料列 Hover 快速操作按鈕（Row Hover Actions）**：
    - 在 Products、Purchases、Sales、Customers、Suppliers 的 DataTable 資料列最後一欄，加入懸停顯示的快速操作按鈕
    - `DataTable` 新增 `rowActions?: (row: T) => React.ReactNode` prop
    - 列 hover 時最後多出一個 `<td className="sticky right-0 px-2">`，渲染 `rowActions(row)` 回傳的內容（透過 `group` + `opacity-0 group-hover:opacity-100` 控制顯現）
    - 各頁面的 `rowActions` 回傳 icon 按鈕組（`flex items-center gap-1`）：
      - Products：`Edit2`（編輯）、`SlidersHorizontal`（調整庫存）、`Trash2`（刪除，`text-destructive`）
      - Purchases：`Eye`（查看詳情）、`CheckCircle`（收貨，僅 pending）、`XCircle`（取消，僅 pending）
      - Sales：`Eye`（查看詳情）、`CheckCircle`（完成，僅 pending）、`XCircle`（取消，僅 pending）
      - Customers / Suppliers：`Eye`（查看詳情）、`Edit2`（編輯）、`Trash2`（刪除）
    - 按鈕樣式：`variant="ghost" size="icon" className="h-7 w-7"`
    - 整欄寬度 `w-24`，不可隱藏（`hideable: false`）；欄位 `key: '__actions__'`，標頭為空字串

53. **右鍵快速選單（Row Context Menu）**：
    - `DataTable` 新增 `contextMenu?: (row: T) => { label: string; icon?: React.ElementType; variant?: 'default' | 'destructive'; onClick: () => void; separator?: boolean }[]` prop
    - `<tr>` 加上 `onContextMenu={(e) => { e.preventDefault(); openContextMenu(e.clientX, e.clientY, row) }}`
    - Context menu 渲染在 `fixed` position（`z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px]`），位置夾在視窗邊界內（若游標 x + 160 > window.innerWidth 則往左對齊）
    - State：`ctxMenu: { x: number; y: number; items: MenuItem[] } | null`（存在 DataTable 元件內部）
    - 關閉：`useEffect` 監聽 `mousedown` 全域事件，觸發時 `setCtxMenu(null)`；按 `Escape` 也關閉
    - 選單項目樣式：`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/60 rounded-sm mx-1`；`separator: true` 則前一個項目後渲染 `<hr className="my-1 border-border" />`
    - Destructive 項目文字顏色 `text-destructive`
    - 各頁面傳入 `contextMenu` prop，項目與 Row Hover Actions 一致（但不限 pending 狀態顯示，由 onClick 自行判斷）

54. **批量狀態操作（Batch Status Actions）**：
    - Purchases 多選後，批次操作浮動列加入「批次收貨」（`CheckCircle` icon）按鈕
    - Sales 多選後，加入「批次完成」（`BadgeCheck` icon）按鈕
    - 兩頁面均加入「批次取消」（`XCircle` icon）按鈕
    - IPC 實作：`purchases:batchReceive(ids[])` → 逐筆呼叫 receive 邏輯並記錄 history，回傳 `{ received: number, skipped: number }`；`sales:batchComplete(ids[])` → 同理
    - `purchases:batchCancel(ids[])` / `sales:batchCancel(ids[])` → 逐筆取消，回傳 `{ cancelled: number, skipped: number }`
    - 執行批量操作時顯示 loading spinner 在按鈕上（`isPending` state）；完成後 toast：`批次收貨完成：N 筆成功，M 筆跳過`
    - global.d.ts 新增：`purchases.batchCancel`、`sales.batchComplete`、`sales.batchCancel`
    - preload index.ts 同步新增對應 IPC invoke

55. **數字欄位步進器（Number Stepper）**：
    - 建立 `StepperInput` 元件（`src/renderer/src/components/ui/StepperInput.tsx`）
    - Props：`value: number, onChange: (v: number) => void, min?: number, max?: number, step?: number, className?: string`
    - 外觀：`<div className="flex items-center">` 包裹 `−` 按鈕 + `<input type="number">` + `+` 按鈕
    - 按鈕樣式：`h-8 w-8 rounded border border-input bg-background hover:bg-muted flex items-center justify-center`；`−` / `+` 文字或 icon
    - Input 樣式：`h-8 w-16 text-center border-y border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring`；隱藏原生 spin buttons（`[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`）
    - 鍵盤支援：`↑` / `↓` 增減 `step`；`Shift+↑` / `Shift+↓` 增減 `step * 10`
    - 邊界：值不得低於 `min`（預設 0）或超過 `max`（預設無限）
    - 整合 react-hook-form：在 PurchaseForm / SaleForm 的 items 數量欄位（`quantity`）用 `StepperInput` 取代 `<Input type="number">`；以 `Controller` 包裹或 `watch/setValue` 整合

56. **快捷鍵說明面板（Keyboard Shortcuts Help Panel）**：
    - 元件命名 `ShortcutOverlay`，位於 `src/renderer/src/components/layout/ShortcutOverlay.tsx`
    - 掛載於 `Layout.tsx`（非個別頁面），全域生效
    - 觸發：按 `?` 鍵開啟（target 非 input/textarea/select 時才處理）；`Escape` 關閉；open state 存於 `ui.store.ts`（`shortcutOpen: boolean`）
    - UI：`fixed inset-0 z-50` backdrop（`bg-background/80 backdrop-blur-sm`），點擊 backdrop 關閉；中央卡片 `max-w-lg w-full bg-card border rounded-2xl shadow-2xl p-6`
    - 標題列：「鍵盤快捷鍵」+ 右上角 `×` 關閉按鈕
    - 快捷鍵以分組呈現，每組有標題（`text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2`）：
      - **全域**：`⌘K` 全域搜尋、`?` 快捷鍵說明、`G+H` 首頁、`G+P` 商品、`G+B` 採購、`G+S` 銷售、`G+R` 報表
      - **表格導航**：`↑↓` 移動列、`Enter` 開啟詳情、`Home/End` 首末列
      - **頁面操作**：`N` 新增訂單（採購/銷售頁）、`Esc` 關閉彈窗
    - 每項顯示格式：左側 label、右側 `<kbd>` badge（`font-mono text-xs border rounded px-1.5 py-0.5 bg-muted`）；多鍵以 `+` 或空格分隔並分別包裹 `<kbd>`
    - 右下角常駐 `?` 浮動按鈕：`fixed bottom-4 right-4 z-40 rounded-full w-8 h-8 bg-muted/80 hover:bg-muted border flex items-center justify-center text-sm font-mono text-muted-foreground`；點擊同樣開啟 overlay

57. **視窗標題動態計數（Dynamic Document Title）**：
    - 在 `Layout.tsx` 中，依 KPI 資料動態更新 `document.title`
    - 計數來源：`kpis.lowStockCount`（低庫存）+ `kpis.overdueCount`（逾期帳款），兩者之和 > 0 時在標題前加 `(N) `
    - 格式：`(24) SkillCraft IMS` → `(0)` 時回復為 `SkillCraft IMS`
    - KPI 資料以 `useQuery(['reports', 'kpis'], ..., { staleTime: 1000 * 60 * 2 })` 取得（與 Sidebar badge 共用同一筆 cache）
    - `useEffect` 監聽 `kpis` 變化後更新；元件 unmount 時恢復預設標題
    - 頁面切換時標題也需保留計數（整合進現有 `title` state 前綴，而非覆寫）

58. **訂單表單商品選擇器庫存提示（Product Picker Stock Badge）**：
    - 適用範圍：`PurchaseForm` 與 `SaleForm` 的商品下拉選單
    - 在每個 `<SelectItem>` 右側顯示庫存數量 badge：
      - `stock_qty === 0`：紅色 `bg-red-500/15 text-red-400`，顯示「缺貨」
      - `stock_qty <= reorder_pt`：橙色 `bg-orange-500/15 text-orange-400`，顯示 `庫存 N`
      - `stock_qty > reorder_pt`：灰色 `text-muted-foreground`，顯示 `庫存 N`
    - SelectItem 內部 layout：`flex items-center justify-between gap-4`，左側商品名稱，右側 badge
    - `PurchaseForm` 顯示所有商品（採購不受庫存限制）；`SaleForm` 缺貨商品仍可選但 badge 明顯標紅
    - 資料來源：現有 `useQuery(['products', 'all'])` 回傳的 `products` 陣列（已包含 `stock_qty` 與 `reorder_pt`）

59. **訂單項目拖曳排序（Drag-and-Drop Order Items）**：
    - 適用範圍：`PurchaseForm` 與 `SaleForm` 的 items `useFieldArray`
    - 每列最左側加 `GripVertical` icon（`cursor-grab text-muted-foreground/40 hover:text-muted-foreground`），僅在 hover 時完全顯示
    - 使用 HTML5 原生 DnD（`draggable`、`onDragStart`、`onDragOver`、`onDrop`）不引入額外套件
    - `dragIndex` state 記錄被拖曳列的 index；`dragOverIndex` 記錄懸停目標
    - `onDrop`：用 `move(dragIndex, dropIndex)`（`useFieldArray` 內建）重新排序
    - 拖曳中目標列顯示 `ring-1 ring-primary/50` 高亮；grid 加一欄：`grid-cols-[16px_2fr_auto_1fr_auto]`

60. **報表頁日期預選與記憶（Reports Date Presets + Persistence）**：
    - Reports 頁面圖表區上方加入快選 chips：`本週`（7天）/ `本月`（30天）/ `近90天`（90天）/ `近180天`（180天）
    - 共用 state `[reportDays, setReportDays] = useState(30)`，初始從 `localStorage['ims-reports-range']` 讀取
    - 切換後同步更新：銷售趨勢（`salesTrend`）、TopProducts（`topProducts`）、採購比較（`purchaseVsSales`）的 query `days` 參數
    - chips 樣式：`rounded-full px-3 py-1 text-xs border`；active 狀態 `bg-primary text-primary-foreground border-primary`；non-active `bg-muted/40 hover:bg-muted`
    - 切換時寫入 `localStorage['ims-reports-range']`
    - `topProductDays` 現有 state 改為與 `reportDays` 同步（移除獨立的 30/90/180 切換按鈕，改用統一 chips）

61. **訂單快速備註（Quick Note Popover）**：
    - 適用範圍：Purchases 與 Sales 頁面的表格列
    - 在 `rowActions` 動作按鈕區加入 `MessageSquare` 圖示按鈕（`h-7 w-7 text-muted-foreground`）
    - 點擊後在原地顯示 Popover（使用 shadcn `Popover` + `PopoverContent`）：
      - 標題「快速備註」
      - `<Textarea rows={3} placeholder="新增備註...">`，預填現有 `notes` 欄位
      - 底部「儲存」Button（`size="sm"`）
    - 送出呼叫現有 `purchases:update(id, { notes })` / `sales:update(id, { notes })` IPC
    - 成功後 `invalidate(['purchases'])` / `invalidate(['sales'])`，顯示 toast success，關閉 Popover
    - 若訂單已有備註，`MessageSquare` icon 顯示 filled 樣式（`fill-current text-primary`）以提示有內容
    - IPC `purchases:update` / `sales:update` 若尚未存在，需新增至 model 與 IPC handler

62. **空狀態引導（Guided Empty State）**：
    - 適用範圍：Products、Purchases、Sales 三頁面，**僅在完全無資料且無任何篩選條件時**顯示
    - 顯示條件：`data.length === 0 && !search && !dateFrom && !dateTo && !categoryFilter`（各頁依現有 filter state 判斷）
    - 元件使用現有 `EmptyState`（`src/renderer/src/components/common/EmptyState.tsx`），但傳入自訂 `action` 與 secondary hint
    - 各頁面 icon / title / description：
      - Products：`Package` icon、「還沒有任何商品」、「新增第一筆商品，或載入範例資料快速體驗」
      - Purchases：`ShoppingCart` icon、「還沒有任何採購單」、「建立採購單以追蹤進貨與成本」
      - Sales：`Receipt` icon、「還沒有任何銷售單」、「建立銷售單以記錄出貨與營收」
    - 主要 action 按鈕：「＋ 新增第一筆」→ `setFormOpen(true)`
    - 次要連結（Products 頁才顯示）：「載入範例資料」→ 呼叫 `window.electronAPI.mockData.generate({ scale: 'S', scenario: 'normal' })` 並 invalidate 所有 query，顯示 loading spinner
    - EmptyState 元件新增可選 `secondaryAction?: { label: string; onClick: () => void; loading?: boolean }` prop

63. **點擊狀態快速篩選（Click-to-Filter Badges）**：
    - 適用範圍：Purchases、Sales 頁面的狀態 badge；Products 頁面的分類 badge
    - Purchases/Sales：點擊列表中的「待確認 / 已收貨 / 已完成 / 已取消」badge → 立即設定 `status` URL param（`setSearchParams({ status: value }, { replace: true })`）；已在篩選中的狀態再次點擊則清除（toggle 行為）
    - Products：點擊分類欄的分類文字 → 立即設定 `categoryFilter` state 並同步 URL param
    - badge 本身加上 `cursor-pointer hover:opacity-80 transition-opacity` 樣式
    - Purchases/Sales 的 `getAll` filter 新增 `status?` 參數（SQL `WHERE status = ?`），queryKey 加入 `status`；URL param key 為 `status`
    - 搜尋列旁加入「狀態」`<Select>` 顯示目前 status 篩選（選項：全部 / 待確認 / 已收貨/已完成 / 已取消），與 URL param 雙向綁定
    - IPC `purchases:getAll` / `sales:getAll` 已有 `status?` 參數，確認 handler 正確套用 WHERE 條件

64. **懸停快速預覽卡（Hover Preview Card）**：
    - 建立 `HoverCard` 元件（`src/renderer/src/components/ui/HoverCard.tsx`）：純 CSS hover trigger，無需 state
      - Props：`trigger: React.ReactNode, children: React.ReactNode, side?: 'top'|'bottom'|'right'（預設 bottom）`
      - 實作：`<div className="relative group inline-block">` 包裹 trigger，children 置於 `absolute z-50 ... invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 delay-300` 的 popover div
      - 樣式：`bg-card border border-border rounded-xl shadow-xl p-3 min-w-[200px]`；位置由 `side` 決定（bottom: `top-full mt-1`，top: `bottom-full mb-1`）
    - **商品預覽**（採購/銷售表單 SelectItem / 明細列中的商品名）：
      - 顯示：縮圖（32px，無圖顯示 Package icon）、商品名稱、SKU、庫存量（帶顏色 badge）、售價 / 進價
      - 縮圖以 `useQuery(['products', 'image', id], ..., { staleTime: Infinity })` 懶載入
    - **客戶/供應商預覽**（Purchases/Sales 列表中的客戶名 / 供應商名）：
      - 顯示：名稱、聯絡人、電話（附 Copy icon）、Email（附 Copy icon）
      - 資料來源：現有 `useQuery(['customers'])` / `['suppliers']` 陣列中 find by id，不新增 IPC
    - 套用範圍：Products 表格的「商品名稱」欄（`HoverCard` 顯示分類/庫存/售價）；Purchases/Sales 的「供應商/客戶」欄

65. **頂部導航進度條（Top Navigation Progress Bar）**：
    - 建立 `NavProgressBar` 元件（`src/renderer/src/components/layout/NavProgressBar.tsx`）
    - 掛載於 `Layout.tsx` 頂部（在 `<Header>` 之前渲染，`fixed top-0 left-0 right-0 z-[9999]`）
    - 顯示條件：監聽 React Query 的全域 `isFetching` 狀態（`useIsFetching()` from `@tanstack/react-query`）
    - 動畫：`isFetching > 0` 時顯示；進度條高 2px，`bg-primary`；以 CSS animation 模擬進度（`0% width:0, 70% width:70%, 100% width:100%`，duration 800ms ease-out）；
      `isFetching` 歸零後再播放 `fadeOut`（`opacity: 0`，200ms），結束後隱藏元素
    - 使用 `useEffect` 監聽 `isFetching`，控制 `active` 與 `finishing` 兩個 state 驅動 CSS class
    - 不阻塞任何互動；不顯示數字百分比

66. **一鍵複製（Copy to Clipboard）**：
    - 建立 `CopyButton` 元件（`src/renderer/src/components/ui/CopyButton.tsx`）：
      - Props：`value: string, className?: string`
      - 點擊後呼叫 `navigator.clipboard.writeText(value)`，icon 切換為 `Check`（綠色 `text-green-500`），1200ms 後自動恢復 `Copy` icon
      - 樣式：`inline-flex items-center justify-center w-5 h-5 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity cursor-pointer`
    - 套用位置（外層容器加 `group` class）：
      - Products 表格 SKU 欄：SKU 文字右側出現 `CopyButton`
      - Purchases/Sales 表格訂單號欄：訂單號右側出現 `CopyButton`
      - Customers/Suppliers 詳情 Dialog 的電話、Email 欄：欄位右側出現 `CopyButton`
    - 不顯示 Toast；僅靠 icon 切換給予視覺回饋，保持介面安靜

67. **Dashboard KPI 數值動畫（Number Count-Up）**：
    - 建立 `useCountUp(target: number, duration?: number)` hook（`src/renderer/src/lib/useCountUp.ts`）：
      - `duration` 預設 600ms
      - 使用 `requestAnimationFrame` 驅動，以 ease-out 曲線（`1 - Math.pow(1 - t, 3)`）插值
      - `target` 改變時重新啟動動畫（前一個 rAF 以 ref 儲存，cleanup 時 `cancelAnimationFrame`）
      - 回傳當前顯示值（`number`）
    - 套用範圍：Dashboard KPI 卡片的四個數值（庫存總值、本月營收、本月毛利率、低庫存數量）
      - 金額類（庫存值、營收）：`useCountUp(value)` 後以 `formatCurrency` 格式化
      - 百分比類（毛利率）：`useCountUp(value, 400)` 後以 `toFixed(1)` 格式化
      - 整數類（低庫存數量）：`useCountUp(value, 400)` 直接顯示
    - 首次載入（`isLoading`）期間不啟動動畫（顯示 skeleton）；`isLoading` → `false` 後 target 從 0 開始動畫
    - 切換語言或主題時不重新觸發（`target` 未變化則不重跑）

68. **批次匯出選取列（Export Selected Rows CSV）**：
    - 適用範圍：Products、Purchases、Sales 頁面，當 `selectedIds.size > 0` 時批次操作浮動列加入「匯出選取」按鈕（`FileDown` icon）
    - 純前端實作：不需新 IPC，從現有 `orders` / `products` 陣列 filter 出 `selectedIds` 對應列，序列化為 CSV 字串
    - CSV 序列化：
      - Products：欄位 `SKU, 商品名稱, 分類, 庫存, 補貨點, 售價, 進價`
      - Purchases：欄位 `訂單號, 供應商, 訂單日期, 狀態, 付款狀態, 金額`
      - Sales：欄位 `訂單號, 客戶, 訂單日期, 狀態, 付款狀態, 金額`
    - 下載方式：建立 Blob（`new Blob([csv], { type: 'text/csv;charset=utf-8;' })`）→ `URL.createObjectURL` → `<a>` click → `URL.revokeObjectURL`；檔名格式：`{page}-export-{YYYY-MM-DD}.csv`
    - CSV header 列加 BOM（`\uFEFF`）確保 Excel 正確顯示中文
    - 匯出成功後顯示 toast success（`已匯出 N 筆`）；不清空選取集合

