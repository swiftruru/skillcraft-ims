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

