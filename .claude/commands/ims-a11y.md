---
name: ims-a11y
description: 當使用者要求無障礙改善、ARIA 標記、鍵盤導航、螢幕閱讀器支援或 WCAG 合規性時觸發。
---

## 無障礙規範（Accessibility / A11y）

75. **CSS 無障礙基礎（prefers-reduced-motion + focus-visible 強化）**：
    - 在 `globals.css` 加入 `@media (prefers-reduced-motion: reduce)` block：停用所有自訂 CSS 動畫（`.animate-flash`, `.animate-fade-in`, `.animate-nav-progress`, `.animate-nav-fade` 等）並覆寫 Radix 的 `data-[state=open]:animate-in` 系列
    - 加入全域 focus-visible 強化：一般 `<button>`、`<a>` 預設 outline 被移除時（`outline-none`），確保 `:focus-visible` 仍有清晰 ring（補 `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`），適用於自訂非 shadcn 的 button/link
    - 全域 CSS：所有可互動元素在 focus-visible 時有 `outline: 2px solid hsl(var(--ring)); outline-offset: 2px;`，透過 `:focus-visible` pseudo-class 觸發（不在 mouse click 時顯示）
    - 受影響元素：`button:focus-visible, a:focus-visible, [role="button"]:focus-visible`

76. **Icon-only 按鈕強制 aria-label**：
    - 所有 `<Button size="icon">` 或外觀為純圖示的 `<button>` 必須有 `aria-label` 或 `title` 屬性，提供語義說明
    - 套用範圍（優先修復這些共用元件）：
      - `Header.tsx`：主題切換按鈕補 `aria-label`（已有 `title`，改為同時加 `aria-label`）
      - `CopyButton.tsx`：補 `aria-label="複製"`
      - `DataTable.tsx`：欄位顯示設定按鈕補 `aria-label="欄位顯示設定"`；分頁上下頁按鈕補 `aria-label`
      - `Layout.tsx`：快捷鍵說明浮動按鈕補 `aria-label="鍵盤快捷鍵說明"`
      - `NotificationBell.tsx`：鈴鐺按鈕已有 `aria-label`（保留）
    - 規則：`title` 僅供 tooltip，螢幕閱讀器建議同時加 `aria-label`（相同文字）

77. **全域螢幕閱讀器公告區（Screen Reader Announcer）**：
    - 建立 `useAnnounce()` hook（`src/renderer/src/lib/useAnnounce.ts`）：
      - 使用 Zustand store 管理 `message: string`
      - `announce(msg: string)` 設定 message，200ms 後自動清空（確保相同訊息再次觸發時也能播報）
    - 在 `Layout.tsx` 加入 `<div aria-live="polite" aria-atomic="true" className="sr-only" id="a11y-announcer">` + `<div aria-live="assertive" aria-atomic="true" className="sr-only" id="a11y-assertive">`
    - `.sr-only` 定義（已是 Tailwind 內建 utility）：`position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;`
    - Toast 的 `variant='success'` 操作後呼叫 `announce(toast.title)`；`variant='destructive'` 使用 assertive channel
    - `useAnnounce` 回傳 `{ announce, announceAssertive }`；在 `useToast` 的 `toast()` 內部自動呼叫（不需每個呼叫點改動）

78. **表單無障礙（aria-invalid + aria-describedby）**：
    - 適用範圍：`PurchaseForm`, `SaleForm`, `ProductForm`（及所有用 react-hook-form 的 Dialog 表單）
    - 實作方式：
      - 每個 `<Input>` / `<Textarea>` / `<Select>` 加上 `aria-invalid={!!errors.fieldName}` 與 `aria-describedby="fieldName-error"`（有 error 時）
      - 錯誤訊息 `<p>` 加上對應的 `id="fieldName-error"` 與 `role="alert"`
    - 範例：
      ```tsx
      <Input
        id="order_date"
        aria-invalid={!!errors.order_date}
        aria-describedby={errors.order_date ? 'order_date-error' : undefined}
        {...register('order_date')}
      />
      {errors.order_date && (
        <p id="order_date-error" role="alert" className="text-xs text-destructive">
          {errors.order_date.message}
        </p>
      )}
      ```
    - items 區塊加上 `<fieldset>` + `<legend className="sr-only">` 語義包覆

79. **跳轉主內容連結（Skip Navigation）**：
    - 在 `Layout.tsx` 的 `<div className="flex h-screen ...">` 第一個子元素加入 skip link：
      ```tsx
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-3 focus:py-1.5 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
      >
        跳至主要內容
      </a>
      ```
    - `<main>` 元素加上 `id="main-content"` 和 `tabIndex={-1}`（允許程式聚焦但不在 Tab 順序中）
    - Skip link 在一般狀態不可見（`sr-only`），Tab 聚焦時才浮現在畫面左上角

80. **Electron 跟隨系統深淺色主題（nativeTheme 整合）**：
    - 移除 `src/main/index.ts` 中的 `nativeTheme.themeSource = 'dark'`（強制覆寫），改為跟隨 renderer 的使用者設定
    - 新增 IPC handler `app:setNativeTheme(theme: 'light' | 'dark' | 'system')`：設定 `nativeTheme.themeSource`
    - preload bridge 新增 `window.electronAPI.app.setNativeTheme(theme)`
    - `theme.store.ts` 的 `toggleTheme()` 呼叫後，同步呼叫 `window.electronAPI.app.setNativeTheme(newTheme)`
    - 新增第三種主題選項 `'system'`：讀取 `nativeTheme.shouldUseDarkColors` 決定 DOM class；在 Settings 頁面加入「跟隨系統」選項
    - 系統主題偵測：`nativeTheme.on('updated', ...)` → 發送 ipc 事件到 renderer → renderer 更新 DOM class（不更新 store，避免覆蓋使用者明確設定）

81. **側欄 aria-current="page"**：
    - `Sidebar.tsx` 使用 `useLocation()` 計算每個 NavLink 的 active 狀態，在 `<NavLink>` 加上 `aria-current={isActive ? 'page' : undefined}`
    - active 判斷規則：`end: true` 的項目用 `pathname === item.to` 嚴格比對；其餘用 `pathname.startsWith(item.to)`；Settings / About 的 `/settings`、`/about` 也適用 startsWith
    - 底部 Settings / About `<NavLink>` 同樣加上 `aria-current`
    - 整個 `<nav>` 加上 `aria-label="主要導覽"`，`<aside>` 加上 `role="navigation"` 改為 `<nav>` 或保留 `<aside>` 並加 `aria-label="主要導覽"`

82. **Dialog 關閉後 focus 歸位（useFocusReturn）**：
    - 建立 `useFocusReturn` hook（`src/renderer/src/lib/useFocusReturn.ts`）：
      - `useRef` 儲存 `lastFocused: HTMLElement | null`
      - `capture()` 方法：`lastFocused.current = document.activeElement as HTMLElement`
      - `restore()` 方法：`lastFocused.current?.focus()`
    - 套用範圍：Products、Purchases、Sales 頁面的「新增」按鈕觸發的 Dialog（`ProductForm`、`PurchaseForm`、`SaleForm`）
    - 在這些頁面中：開啟 Dialog 前呼叫 `capture()`（在 `setFormOpen(true)` 前）；Dialog 的 `onOpenChange(false)` 後呼叫 `restore()`
    - Radix `Dialog.Content` 的 `onCloseAutoFocus` 預設會嘗試返回 focus，但對於程式觸發開啟的 Dialog 不可靠，此 hook 作為補強
    - `ProductForm` / `PurchaseForm` / `SaleForm` 新增 `onClosed?: () => void` prop，Dialog 完全關閉後呼叫（用 `onOpenChange(false)` 觸發）

83. **DataTable 排序欄標題 aria-sort**：
    - `DataTable.tsx` 的 `<th>` 排序欄加上 `aria-sort` 屬性：
      - `sortKey === col.key && sortDir === 'asc'` → `aria-sort="ascending"`
      - `sortKey === col.key && sortDir === 'desc'` → `aria-sort="descending"`
      - 其他可排序欄 → `aria-sort="none"`
      - 非排序欄 → 不加 `aria-sort`
    - 排序按鈕改為 `<button>` 包裹欄標題文字（`role="button"` 或直接 `<button type="button">`），讓鍵盤可 focus 並按 Enter/Space 觸發排序
    - `<th>` 加上 `scope="col"` 讓螢幕閱讀器正確識別欄標題

84. **aria-busy 載入狀態**：
    - Products、Purchases、Sales、Customers、Suppliers 頁面的主資料表容器（`<div className="rounded-lg border border-border bg-card">`）加上：
      - `aria-busy={isLoading}` — 載入中時螢幕閱讀器知道內容尚未就緒
      - `aria-label="資料表格"` — 給容器語義標籤
    - `isLoading` 為 true 時，不只顯示 `TableSkeleton`，也讓輔助技術得知「正在載入」
    - `TableSkeleton` 本身加上 `aria-hidden="true"`（骨架動畫對 AT 無語義意義）+ 外層 `<div role="status" aria-label="載入中" aria-live="polite">` 包裹一次公告

85. **nativeTheme 即時反應系統主題切換**：
    - `src/main/index.ts` 加入 `nativeTheme.on('updated', () => { mainWindow?.webContents.send('app:nativeThemeUpdated', nativeTheme.shouldUseDarkColors ? 'dark' : 'light') })`
    - preload 加入 `app.onNativeThemeUpdated: (cb: (theme: 'dark' | 'light') => void) => ipcRenderer.on('app:nativeThemeUpdated', (_e, t) => cb(t))`
    - `theme.store.ts` 新增 `systemTheme: 'dark' | 'light' | null` field（初始 null）；新增 `setSystemTheme(t)` action
    - `App.tsx` 的 `useEffect` 加入 `window.electronAPI.app.onNativeThemeUpdated((t) => { if (themeStore.theme === 'system') { document.documentElement.classList.toggle('dark', t === 'dark') } })`
    - 只在使用者選擇「跟隨系統」（`theme === 'system'`）時才自動跟隨，避免覆蓋使用者明確設定的 light/dark

86. **Status Badge 螢幕閱讀器文字補強**：
    - 套用範圍：`Purchases.tsx`、`Sales.tsx` 列表中的狀態 badge；`PurchaseDetailDialog`、`SaleDetailDialog` 中的狀態顯示
    - 在 badge 函式（`getStatusBadge`、`getPaymentBadge`）回傳的 JSX 中，在可見文字前加 `<span className="sr-only">狀態：</span>`
    - 純色點（若有）需搭配文字說明
    - 逾期 badge（`bg-orange-500/20 text-orange-400`）加 `aria-label="採購單逾期"` 或在 badge 文字前加 sr-only「逾期提醒：」
    - 目標：螢幕閱讀器播報「狀態：待確認」而非只播報「待確認」（加上語境前綴）

87. **CreatableSelect 完整 ARIA Combobox 語意**：
    - `CreatableSelect.tsx` 加入 ARIA Combobox 語意：
      - 容器 `<div>` 加 `role="combobox"` `aria-expanded={open}` `aria-haspopup="listbox"` `aria-owns="creatable-listbox-{id}"`
      - `<input>` 加 `aria-autocomplete="list"` `aria-controls="creatable-listbox-{id}"` `aria-activedescendant` 指向當前高亮選項 id
      - Dropdown `<div>` 加 `role="listbox"` `id="creatable-listbox-{id}"`
      - 每個選項 `<button>` 改為 `<div role="option">` `aria-selected={value === option.value}` `id="opt-{value}"`
    - 鍵盤導覽強化：`ArrowDown` / `ArrowUp` 在選項間移動（`highlightedIndex` state）；`Enter` 選取當前高亮項；`Tab` 關閉 dropdown
    - 產生唯一 id：`useId()` hook（React 18 內建）
    - 高亮項目滾動至可見（`scrollIntoView`）

88. **Context Menu 鍵盤開啟（Shift+F10 / Menu key）**：
    - `DataTable.tsx` 的 `handleKeyDown` 加入：`Shift+F10` 或 `key === 'ContextMenu'` → 以目前 focused row 的位置開啟 context menu
    - 位置計算：取 `focusedRowRef.current?.getBoundingClientRect()`，在列右側邊緣顯示（`x = rect.right - 160, y = rect.top`）
    - 需要 `contextMenu` prop 且 `focusedIdx >= 0` 才啟用
    - Context menu 開啟後，第一個選項自動獲得焦點（focus）；`ArrowUp` / `ArrowDown` 在選項間移動；`Escape` 關閉並歸還焦點到 table row
    - Context menu div 加上 `role="menu"`；每個選項加 `role="menuitem"`

89. **路由切換後 focus 移到頁面標題**：
    - `Layout.tsx` 在現有 `useEffect` 監聽 `location.pathname` 後加入：`document.getElementById('main-content')?.focus()`
    - `<main id="main-content">` 加上 `tabIndex={-1}`（已在 Rule 79 實作的 skip link 同一元素，如果已有 `tabIndex` 則直接用）
    - 這讓螢幕閱讀器在換頁後重新從主內容開始讀取，而非停留在之前 focus 的側欄項目
    - 注意：`tabIndex={-1}` 讓 `<main>` 可被程式聚焦但不在 Tab 順序中（不影響鍵盤使用者流程）

90. **DataTable ARIA Table 語意**：
    - `DataTable.tsx` 的 `<table>` 加上 `role="grid"` `aria-rowcount={sorted.length}` `aria-label` prop（由呼叫端透過 `tableLabel?: string` prop 傳入，如「商品列表」）
    - 所有 `<th>` 加上 `scope="col"`（Rule 83 同時處理）
    - `<thead>` 的 `<tr>` 加上 `role="row"`；`<th>` 加 `role="columnheader"`
    - `<tbody>` 的 `<tr>` 加上 `role="row"` `aria-rowindex={idx + 1}`；`<td>` 加 `role="gridcell"`
    - `DataTable` 新增 `tableLabel?: string` prop，傳入 `aria-label` 給 `<table>`；若未提供則省略

91. **prefers-contrast: more 高對比支援**：
    - `globals.css` 新增 `@media (prefers-contrast: more)` block：
      - `text-muted-foreground` 對應的顏色（`--muted-foreground`）提高至接近前景色
      - border 顏色加強（`--border` HSL 亮度拉高）
      - 連結、badge 等 low-opacity 顏色改為不透明版本
    - CSS 內容：
      ```css
      @media (prefers-contrast: more) {
        :root {
          --muted-foreground: 222.2 40% 20%;
          --border: 214.3 31.8% 60%;
        }
        .dark {
          --muted-foreground: 215 20.2% 85%;
          --border: 217.2 32.6% 40%;
        }
      }
      ```
    - 僅調整 CSS token，無需改動元件

92. **確保字型縮放以 rem 為基礎**：
    - 確認 `body` 的 `font-size` 未寫死為 px（Tailwind 預設是 `16px` 但 rem 基礎），所有 Tailwind `text-*` 都是 rem
    - 在 `globals.css` 加入 `html { font-size: 100%; }` 確保根字體尊重使用者瀏覽器偏好設定（不使用 `html { font-size: 14px; }` 等固定值）
    - 若有自訂 `font-size` 的 inline style 或 CSS，改為 `em` 或 `rem`
    - 受惠範圍：使用者在 macOS 系統偏好「顯示器縮放」或瀏覽器字型大小設定放大時，UI 正確等比縮放

93. **HTML lang 屬性動態切換**：
    - `App.tsx` 訂閱 `useLangStore`，每次語言切換時更新 `document.documentElement.lang`
    - 對應值：`'zh'` → `'zh-TW'`；`'en'` → `'en'`
    - 以 `useEffect` 監聽 `lang` 變更，初始化時也執行一次
    - 這讓螢幕閱讀器能以正確語言口音朗讀頁面內容

94. **圖表無障礙替代說明（Chart Accessibility）**：
    - 所有 Recharts `<ResponsiveContainer>` 的外層容器加上 `role="img"` 和 `aria-label="[圖表說明]"`
    - `aria-label` 格式：`"[圖表類型]：[主要數據摘要]"`，例如 `"銷售趨勢折線圖：最近 30 天每日營收"`
    - 在 `<ResponsiveContainer>` 後加入 `<p className="sr-only">[文字摘要說明]</p>`，提供主要數字讓螢幕閱讀器播報
    - 適用所有 Dashboard、Reports、StockTake、Products 等頁面的 Recharts 圖表

95. **拖曳功能鍵盤替代方案（DnD Keyboard Alternative）**：
    - `PurchaseForm` 與 `SaleForm` 的 items 列，在 `GripVertical` icon 旁（或行末）加入 `▲` / `▼` 兩個小按鈕
    - 按鈕樣式：`h-6 w-6 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted`，`aria-label="向上移動"` / `"向下移動"`
    - 功能：`▲` 呼叫 `move(i, i - 1)`（`i === 0` 時 disabled）；`▼` 呼叫 `move(i, i + 1)`（`i === fields.length - 1` 時 disabled）
    - 只在 `fields.length > 1` 時顯示按鈕；grid 列多一欄容納按鈕組
    - WCAG 2.1 SC 2.1.1：所有功能必須可透過鍵盤操作

96. **Dialog 初始焦點強化（Initial Focus Management）**：
    - Radix Dialog 會自動將焦點移至第一個可聚焦元素（通常是關閉按鈕 ×）
    - 對於表單 Dialog（PurchaseForm、SaleForm、ProductForm），應將初始焦點移至第一個有意義的輸入欄位，而非關閉按鈕
    - 做法：使用 Radix `DialogContent` 的 `onOpenAutoFocus` prop，呼叫 `e.preventDefault()` 後以 `setTimeout(0)` 手動 focus 第一個 input
    - 如：`onOpenAutoFocus={(e) => { e.preventDefault(); setTimeout(() => firstInputRef.current?.focus(), 0) }}`
    - `ConfirmDialog` 保持預設（焦點到確認按鈕）

97. **焦點不被固定元素遮擋（Focus Not Obscured，WCAG 2.2 SC 2.4.11）**：
    - 在 `globals.css` 加入全域規則：`*:focus-visible { scroll-margin-top: 3.5rem; scroll-margin-bottom: 4rem; }`
    - `3.5rem`（56px）覆蓋 Header 高度；`4rem`（64px）覆蓋底部浮動操作列
    - 這確保鍵盤導覽時，聚焦元素不被 sticky Header 或 fixed 底部工具列遮住

98. **觸控目標最小尺寸（Touch Target Size，WCAG 2.5.8）**：
    - WCAG 2.2 Level AA 要求觸控目標至少 24×24px（目標本身）或 44×44px（含間距）
    - 現有 `h-7 w-7`（28px）的 icon 按鈕已符合 24px 最低要求
    - 針對 `size="icon"` 但小於 28px 的元素（如 `h-6 w-6`），補上 `p-1`（padding）讓實際點擊區域達標
    - 在 `globals.css` 加入：`button:focus-visible, [role="button"]:focus-visible { min-height: 24px; min-width: 24px; }`

99. **非文字內容對比度（Non-text Contrast，WCAG 1.4.11）**：
    - UI 元件邊框（`border-border`）、圖示（`text-muted-foreground`）與其背景的對比需達到 3:1
    - 在 `globals.css` 的 `:root` 與 `.dark` 確保 `--border` HSL 值在亮色模式下達到 3:1（對白背景），暗色模式下對深色背景達到 3:1
    - 若現有 token 對比不足，適度調整亮度值（`--border` 亮色建議 `< 65%`）
    - Status badge 顏色（`bg-green-500/15 text-green-400`）需確保文字對背景對比 ≥ 4.5:1

100. **DataTable 完整語意標記（Semantic Table Markup）**：
    - `<table>` 加上 `role="grid"`、`aria-label` 由呼叫端透過 `tableLabel?: string` prop 傳入（如「商品列表」、「採購單列表」）
    - 所有 `<th>` 加上 `scope="col"` — 讓螢幕閱讀器知道這是欄標題
    - 可排序欄的 `<th>` 加上 `aria-sort`（見 Rule 83）
    - 排序觸發按鈕由 `<span>` 改為 `<button type="button">` 包裹欄位文字（讓鍵盤可 focus 並以 Enter/Space 觸發）
    - `<tbody>` 每個 `<tr>` 加 `role="row"`；`<td>` 加 `role="gridcell"` `aria-rowindex={idx + 2}`（+2 因 header 佔 1）
    - 各頁面呼叫 `<DataTable tableLabel="商品列表" />` 等傳入 label

101. **各頁面 `<h1>` 標題（Page-level Heading）**：
    - WCAG 2.4.6：每頁應有清晰的標題描述頁面內容
    - Products、Purchases、Sales、Customers、Suppliers、Reports、Settings、About、StockTake、InventoryHistory、Receivables 頁面頂部的 `<h2>` 或 `text-xl font-bold` 的 `<div>` 改為 `<h1 className="text-xl font-bold">`
    - Layout 的頁面容器不輸出任何 heading；各頁面自行決定 `<h1>`
    - Dialog 標題使用 `<h2>`（Radix `DialogTitle` 已是 `<h2>`，保持不動）
    - 卡片標題使用 `<h3>`

102. **商品圖片 alt 文字（Product Image Alt Text）**：
    - Products 表格縮圖 `<img>` 加上 `alt={product.name}`（若有圖）；無圖佔位符的 Package icon 外層 `<div>` 加 `aria-label={product.name}` 或以 `role="img"` + `aria-label`
    - ProductForm 圖片預覽區的 `<img>` 加 `alt="商品圖片預覽"`
    - 以 base64 或 objectURL 顯示圖片時，alt 使用商品名稱（從 form `watch('name')` 取得）
    - 無意義裝飾圖片（dashboard icons 等）使用空 `alt=""`

103. **搜尋結果數量即時公告（Search Result Live Region）**：
    - 在 Products、Purchases、Sales、Customers、Suppliers 各頁面加入隱藏的 `aria-live` 公告區：
      ```tsx
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {search && `找到 ${filteredData.length} 筆結果`}
      </div>
      ```
    - 此元素隨 `filteredData.length` 與 `search` 變化，讓螢幕閱讀器播報「找到 N 筆結果」
    - 只在 `search` 非空時才輸出文字（空搜尋不播報）
    - `aria-atomic="true"` 確保整句一起播報，避免只播報數字

104. **分頁列完整 ARIA（Pagination ARIA）**：
    - DataTable 分頁區包在 `<nav aria-label="分頁導覽">` 內
    - 上一頁按鈕加 `aria-label="上一頁"` `disabled` 時加 `aria-disabled="true"`
    - 下一頁按鈕加 `aria-label="下一頁"` `disabled` 時加 `aria-disabled="true"`
    - 「第 X / Y 頁」文字加上 `aria-live="polite"` `aria-atomic="true"`，讓翻頁時螢幕閱讀器播報目前頁碼

105. **表單明細區塊語意包覆（Form Items Fieldset）**：
    - `PurchaseForm` 與 `SaleForm` 的明細表格區塊用 `<fieldset>` 包裹：
      ```tsx
      <fieldset className="space-y-3 border-0 p-0 m-0">
        <legend className="sr-only">訂單明細項目</legend>
        {/* items grid */}
      </fieldset>
      ```
    - `border-0 p-0 m-0` 去除 `<fieldset>` 的預設邊框與間距，不改變視覺外觀
    - `<legend className="sr-only">` 讓螢幕閱讀器在進入表格時播報「訂單明細項目」

106. **單字元快捷鍵說明（Single-char Shortcut Disclosure，WCAG 2.1.4）**：
    - WCAG 2.1 SC 2.1.4：若有以單一字母鍵觸發的快捷鍵，需提供停用或重新對應的方式
    - 在 `ShortcutOverlay.tsx` 快捷鍵說明面板底部加入一段說明：
      > 「在輸入框、文字欄位或選單內時，所有單鍵快捷鍵（N、?、G 組合鍵等）會自動停用，不影響文字輸入。」
    - 樣式：`mt-4 pt-3 border-t border-border text-xs text-muted-foreground`
    - Layout keydown handler 已有 `if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return` 保護邏輯，此說明文字是使用者可見的確認

107. **狀態變更後螢幕閱讀器公告（Status Change Announcement）**：
    - Purchases、Sales 頁面在訂單狀態成功更新後，除顯示 Toast 外，同時呼叫 `announce()` 公告
    - 公告文字格式：`「訂單 {orderNo} 已{動作}」`（如「訂單 PO-0012 已標記收貨」、「銷售單 SO-0005 已完成」）
    - `announce()` 為 Rule 77 定義的 `useAnnounce` hook；`variant='success'` toast 使用 polite channel，`variant='destructive'` 使用 assertive channel
    - 批次操作（batchReceive、batchComplete）公告：`「已批次更新 N 筆訂單」`

108. **鍵盤可及的 Context Menu（Context Menu Keyboard Access）**：
    - `DataTable.tsx` 的 keyboard handler 新增：聚焦列按 `Shift+F10` 或 `ContextMenu` key → 以聚焦列座標開啟 context menu
    - 位置：取 `document.querySelector('[data-focused]')?.getBoundingClientRect()`，在列右側顯示
    - Context menu 開啟後：第一項自動聚焦；`ArrowUp`/`ArrowDown` 在項目間移動；`Enter`/`Space` 選取；`Escape` 關閉並歸還焦點到 table
    - Context menu container 加 `role="menu"`；每個選項加 `role="menuitem"`；分隔線加 `role="separator"`
    - 只在 `contextMenu` prop 存在且 `focusedIdx >= 0` 時啟用鍵盤觸發

109. **路由切換後焦點移至主內容（Route Change Focus）**：
    - `Layout.tsx` 的 `useEffect` 監聽 `location.pathname` 變化後：
      ```ts
      useEffect(() => {
        document.getElementById('main-content')?.focus()
      }, [location.pathname])
      ```
    - `<main id="main-content" tabIndex={-1}>` 已在 Rule 79 定義（確認已加 `tabIndex={-1}`）
    - 這讓螢幕閱讀器換頁後從主內容重新開始讀取，不停留在側欄

110. **Dialog 關閉後焦點歸位（Focus Return After Dialog Close）**：
    - 建立 `useFocusReturn` hook（`src/renderer/src/lib/useFocusReturn.ts`）：
      ```ts
      export function useFocusReturn() {
        const ref = useRef<HTMLElement | null>(null)
        const capture = () => { ref.current = document.activeElement as HTMLElement }
        const restore = () => { ref.current?.focus() }
        return { capture, restore }
      }
      ```
    - 套用範圍：Products「新增/編輯商品」按鈕、Purchases「新增採購單」按鈕、Sales「新增銷售單」按鈕
    - 開啟 Dialog 前呼叫 `capture()`；`onOpenChange(false)` 後呼叫 `restore()`
    - Radix Dialog 的 `onCloseAutoFocus` 已嘗試返回焦點，但對程式觸發的 Dialog 有時不可靠；此 hook 為補強手段

111. **表單欄位 autocomplete 屬性**：
    - 適用範圍：CustomerForm、SupplierForm（新增/編輯客戶與供應商的 Dialog 表單）
    - 在對應 `<Input>` 欄位加上 `autoComplete` prop：
      - 名稱欄位：`autoComplete="organization"`（公司名）或 `autoComplete="name"`（個人名）
      - 聯絡人：`autoComplete="name"`
      - 電話：`autoComplete="tel"`
      - Email：`autoComplete="email"`
      - 地址：`autoComplete="street-address"`
    - 符合 WCAG 1.3.5（識別輸入用途），輔助運動障礙用戶減少輸入量
    - 新增/編輯模式均套用；不影響 react-hook-form 行為（`autoComplete` 是獨立 HTML 屬性）

112. **LoadingSpinner role="status"**：
    - `LoadingSpinner` 元件（`src/renderer/src/components/common/LoadingSpinner.tsx`）加上語意屬性：
      - 外層容器加 `role="status"` + `aria-label="載入中"`
      - 內部旋轉 svg/div 加 `aria-hidden="true"`（避免重複播報）
      - 加入 `<span className="sr-only">載入中，請稍候</span>`（螢幕閱讀器可讀文字）
    - 套用範圍：所有使用 `<LoadingSpinner />` 的頁面自動受益，無需逐頁修改
    - TableSkeleton 的外層 wrapper 已有 `role="status"` aria-live（Rule 84），不受影響

113. **表單送出錯誤摘要（Error Summary）**：
    - 適用範圍：`ProductForm`、`PurchaseForm`、`SaleForm`
    - 實作：在表單 `onSubmit` 被呼叫但 `Object.keys(errors).length > 0` 時，在表單頂部以 `role="alert"` 顯示錯誤摘要區塊
    - 摘要區塊樣式：`rounded-lg border border-destructive/50 bg-destructive/5 p-3 space-y-1`
    - 每個錯誤顯示為可點擊連結（`<a href="#fieldId">`），點擊後 focus 到對應欄位
    - `errors` 物件為空時不顯示此區塊（`Object.keys(errors).length === 0` → `null`）
    - react-hook-form 的 `formState.errors` 會在驗證後自動更新，直接讀取即可
    - 首次開啟表單（尚未送出）不顯示摘要；只在使用者點擊送出後且有錯誤才顯示
    - i18n key（直接用固定中文）：`「請修正以下 N 個錯誤：」`

114. **對話框 aria-modal="true"**：
    - 所有使用 Radix `<DialogContent>` 的元件，確認已套用 `aria-modal="true"`（Radix UI v1.x 預設會加，但自訂覆蓋時可能遺失）
    - 檢查並補上的元件：`ProductForm`、`PurchaseForm`、`SaleForm`、`CustomerDetailDialog`、`SupplierDetailDialog`、`QuickPurchaseDialog`、`BatchPriceDialog`、`ConfirmDialog`
    - 實作：在各 `<DialogContent className="...">` 補上 `aria-modal="true"` 屬性
    - 目的：告知 NVDA/JAWS/VoiceOver 焦點應被限制在 Dialog 內，防止螢幕閱讀器游走至背景遮罩後的內容

115. **Sidebar 徽章動態播報**：
    - 側欄低庫存/待處理訂單徽章數字首次出現或數值增加時，透過 `useAnnounce`（Rule 77）的 `announce()` 播報訊息
    - 偵測方式：`useEffect` 比較前後值（`usePrevious` pattern）；只在數值從 0→N 或 N→M（M>N）時播報，避免每次 refetch 都公告
    - 播報文字：`「低庫存商品：N 項」`、`「待處理採購：N 筆」`、`「待處理銷售：N 筆」`
    - 實作位置：`Sidebar.tsx` 內，讀取 `useQuery(['reports', 'kpis'])` 數值後觸發
    - 使用 `usePrevious<number>(value)` hook（inline 實作：`const ref = useRef(value); useEffect(() => { ref.current = value }); return ref.current`）

116. **顏色不作為唯一傳達方式（Color-Independent Status Icons）**：
    - 適用範圍：Purchases/Sales 列表的狀態 badge、付款狀態 badge
    - 在每個 badge 前加入對應小圖示（`aria-hidden="true"`，視覺補充，不新增 aria 文字）：
      - `pending`（待處理）→ `Clock` icon（`w-3 h-3`）
      - `received` / `completed`（已收貨/已完成）→ `CheckCircle` icon
      - `cancelled`（已取消）→ `XCircle` icon
      - `paid`（已付款）→ `BadgeCheck` icon
      - `unpaid`（未付款）→ `Circle` icon（空心）
      - 逾期 → `AlertTriangle` icon
    - badge 內 layout：`inline-flex items-center gap-1`；icon `w-3 h-3 shrink-0`
    - 符合 WCAG 1.4.1（不只用顏色傳達資訊）

117. **Tooltip accessible（role="tooltip" + aria-describedby）**：
    - 建立 `AccessibleTooltip` 元件（`src/renderer/src/components/ui/AccessibleTooltip.tsx`）：
      - Props：`content: string, children: React.ReactElement, id?: string`
      - 使用 `useId()` 產生唯一 tooltip id
      - wrapper `<span className="relative group inline-flex">`
      - children clone 加上 `aria-describedby={tooltipId}`
      - tooltip div：`role="tooltip" id={tooltipId}`，樣式同現有 `title` tooltip
      - `invisible group-hover:visible group-focus-within:visible` 顯示控制
    - 套用位置：Header 的主題切換按鈕、同步按鈕；Sidebar badge 數字；DataTable 欄位顯示設定按鈕
    - 取代這些位置的原生 `title` 屬性（`title` 在觸控裝置不顯示，且不符合 WCAG 1.3.1）

118. **數字輸入欄位 inputmode**：
    - 適用範圍：所有 `<Input type="number">` 或金額/數量輸入欄位
    - 補上 `inputMode="numeric"` — iOS/Android 直接彈出數字鍵盤
    - 補上 `pattern="[0-9]*"` — iOS Safari 在有 `pattern` 時才正確顯示數字鍵盤
    - 套用元件：`StepperInput`（quantity）、ProductForm 的 `sell_price`/`buy_price`/`stock_qty`/`reorder_pt`、PurchaseForm/SaleForm 的 `unit_price`/`quantity`、Products inline 快速編輯 input
    - 不套用到日期或文字搜尋欄位

119. **表格 `<caption>`（sr-only）**：
    - 適用範圍：所有手動 `<table>` 元件（StockTake ListView/DetailView、InventoryHistory、Receivables）
    - 在 `<table>` 的第一個子元素加入 `<caption className="sr-only">{說明文字}</caption>`
    - 各表格 caption：
      - StockTake 列表：`「盤點作業列表」`
      - StockTake 明細：`「盤點明細：${take.take_no}」`
      - InventoryHistory：`「庫存異動歷史記錄」`
      - Receivables 銷售：`「應收帳款－銷售訂單」`；採購：`「應付帳款－採購訂單」`
    - `DataTable` 元件的 `<table>` 已有 `aria-label`（Rule 90），不需再加 caption

120. **焦點可見度強化（Enhanced Focus Ring）**：
    - 在 `globals.css` 針對深色背景上的按鈕補強 focus ring 對比：
      ```css
      /* 深色背景按鈕 focus ring 補白邊（outline-offset 效果） */
      .dark button:focus-visible,
      .dark [role="button"]:focus-visible,
      .dark a:focus-visible {
        outline: 2px solid hsl(var(--ring));
        outline-offset: 2px;
        box-shadow: 0 0 0 4px hsl(var(--background));
      }
      ```
    - Sidebar NavLink active 項目（深色背景）的 `:focus-visible` 補 `ring-2 ring-offset-2 ring-ring`
    - 符合 WCAG 2.4.7（Focus Visible）與 2.4.11（Focus Not Obscured）

121. **列印樣式表（Print Stylesheet）**：
    - 在 `globals.css` 加入 `@media print` block：
      ```css
      @media print {
        aside, header, .no-print, [data-tour], button, nav { display: none !important; }
        main { margin: 0; padding: 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; }
        a { text-decoration: none; color: inherit; }
        .text-muted-foreground { color: #666 !important; }
      }
      ```
    - Reports 頁面右上角加入「列印」按鈕（`Printer` icon，`variant="ghost" size="sm"`），呼叫 `window.print()`
    - 列印時自動展開折疊區塊（Recharts 圖表無法列印，加 `.recharts-wrapper::after { content: "[圖表請見螢幕版]" }` 替代說明）

122. **頁面品牌名語言標記（lang="en" on brand name）**：
    - `Layout.tsx` / `Sidebar.tsx` 中品牌名稱「SkillCraft IMS」加上 `<span lang="en">SkillCraft IMS</span>`
    - Header 的 `<h1>` 若含英文品牌名，同樣套用 `<span lang="en">`
    - 目的：螢幕閱讀器以英文口音朗讀英文品牌名，以中文口音朗讀其餘 UI 文字，符合 WCAG 3.1.2（Language of Parts）
