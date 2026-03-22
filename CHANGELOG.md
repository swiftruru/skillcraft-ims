# Changelog

## [v0.9.1] — 2026-03-22

### 新功能

- **多模型路由**：Regex 自動判斷問題複雜度——純查詢使用 Haiku（低延遲低成本），含分析/趨勢/比較的問題自動升級 Sonnet；每則回答 metadata 列顯示所使用的模型徽章
- **實體擷取（Entity Extraction）**：自動識別問題中的商品、客戶、供應商名稱，透過 SQLite LIKE 解析為精確 ID，注入 `WHERE IN (...)` 條件，大幅提升含實體名稱問題的回答準確性
- **引用來源標注（Citation Attribution）**：AI 回答末尾自動解析 `[SOURCES:]` 標記，在 metadata 列以彩色徽章顯示引用的資料來源（藍=庫存、綠=銷售、橘=客戶、黃=供應商）
- **可排序互動表格**：AI 回答含多欄比較資料時，自動渲染為互動式表格——點擊欄位標題可升/降排序，數值欄位自動右對齊，右上角一鍵複製為 TSV
- **追問建議持久化**：每則 AI 回答的 3 個追問建議現在存入 SQLite；重新進入歷史 Session 時，建議 chips 同樣顯示

### 改善

- **防護層（Guard）訊息持久化**：被攔截的超出範疇問答也存入 Session 歷史，重新進入對話時完整保留
- **Guard 範疇擴展**：「進銷存是什麼」等系統概念說明問題現在可正常回答
- **Session 快取修正**：確保重新進入歷史對話時資料最新

---

## [v0.9.0] — 2026-03-22

### 新功能

- **RAG Pipeline 全面升級**：AI 問答從基礎 RAG 升級為多階段智慧管線
  - **Pre-Retrieval Guard**：提示詞防護層，自動偵測並拒絕非進銷存相關問題（如「寫貪食蛇演算法」）
  - **Query Rewriting**：Guard 與重寫合併為單次 LLM 呼叫，自動將口語化問題改寫為精確查詢語句
  - **Dynamic Time Range Detection**：純 Regex 解析「上週」「本月」「今年」「近 N 天」等中文時間表達，自動轉換為 SQLite 日期條件
  - **Adaptive Retrieval**：依問題主題（庫存/銷售/客戶/供應商）動態決定撈取哪些資料段，避免無關噪音
  - **Streaming Responses**：Claude API 串流輸出，回答逐字即時顯示，含閃爍游標
  - **Follow-up Suggestions**：每則回答附帶 3 個 AI 生成的後續問題，點擊即可送出
  - **RAG Faithfulness Scoring**：回答後自動評分（0–100），標示回答是否忠實於業務資料，含評分說明
  - **Conversation Summarization**：超過 8 輪訊息時，自動摘要舊訊息注入 system prompt，維持對話連貫性
  - **Token Usage Display**：每則回答顯示 input / output token 用量
- **多輪對話記憶**：對話紀錄存入 SQLite（`ai_chat_sessions` + `ai_chat_messages`），重啟 App 歷史仍保留
- **側邊欄 Session 列表**：可建立多個對話 Session，點擊切換歷史紀錄，可刪除個別 Session
- **錯誤重試按鈕**：API 呼叫失敗時顯示錯誤訊息，附「重試」按鈕一鍵重新送出最後一個問題
- **Word 匯出改善**：AI 問答匯出 `.docx` 時正確渲染 GFM Markdown 表格（docx Table 物件），Retrieval Context 按行分段顯示
- **動態聊天面板高度**：自動偵測視窗大小，聊天區域精確填滿剩餘空間，輸入框不再超出畫面

### 變更

- **鍵盤快捷鍵調整**：⌘/Ctrl+Enter 送出問題，Enter 換行（原為 Enter 送出，Shift+Enter 換行）

### 修正

- **Session 側邊欄點擊無反應**：修正 React Query `staleTime: Infinity` 快取導致 `useEffect` 不觸發的問題
- **Auto-updater macOS ZIP 修正**：`electron-builder.config.ts` 新增 `zip` target；Release workflow 改以 zip sha512 產生 `latest-mac.yml`，解決 `ZIP file not provided` 錯誤
- **`updater:checkForUpdates` IPC 錯誤**：handler 回傳值改為 `null`，避免 `CancellationToken` 無法被 structured clone 序列化導致的「An object could not be cloned」錯誤

---

## [v0.8.3] — 2026-03-22

### 新功能

- **AI 問答（RAG Chat）**：AI 頁面新增「AI 問答」Tab，實作完整 RAG 流程
  - Step 1 Retrieval：從 SQLite 即時查詢庫存概況、近 30 天銷售、待處理訂單、客戶與帳款資料
  - Step 2 Augmented：將查詢結果格式化為結構化 prompt context
  - Step 3 Generation：呼叫 Claude API（claude-haiku-4-5）產生繁體中文回答
  - 每則回答可展開「查看本次使用的業務資料（Retrieval Context）」，完整呈現 RAG 流程
- **Mock 建議問題**：題庫 12 道問題，每次點擊 Mock 按鈕隨機抽取 4 題顯示
- **Markdown 渲染**：AI 回答以 react-markdown + remark-gfm 渲染，支援標題、條列、**粗體**、表格
- **多行輸入框**：問題輸入改為 Textarea，Enter 送出，Shift+Enter 換行

### 文件

- README 頂部新增 RAG 整合展示說明，含三步驟對照表

---

## [v0.8.2] — 2026-03-16

### 修正

- **Auto-updater 修復**：Release workflow 改為在 build 後手動產生 `latest-mac.yml`（macOS）與 `latest.yml`（Windows）並上傳至 GitHub Release，解決舊版本自動更新時出現 `Cannot find latest-mac.yml` 404 錯誤的問題

---

## [v0.8.1] — 2026-03-16

### 修正

- **AiInsight 型別錯誤**：`AiForecastItem` 不含 `predicted_demand_30d` 欄位，改以 `avg_daily_sales × 30 × 0.5` 計算建議補貨點
- **PurchaseForm append 型別錯誤**：新增品項按鈕與 SKU 快速新增列的 `append()` 呼叫缺少 `discount_pct: 0`，導致 CI typecheck 失敗

---

## [v0.8.0] — 2026-03-16

### 新功能

- **訂單品項折扣（Order Line Discount）**：採購單與銷售單的每個明細行新增「折扣 %」欄位（0–100%），小計自動以 `unit_price × quantity × (1 - discount_pct / 100)` 計算；詳情 Dialog 新增「折扣」欄顯示折扣率與折後小計；DB migration `019_order_line_discount.sql` 加入 `discount_pct REAL NOT NULL DEFAULT 0`
- **對帳單 Tab（Account Statement）**：客戶詳情與供應商詳情 Dialog 新增「對帳單」Tab；可設定日期區間（預設本月），列出期間內所有訂單（含狀態與付款狀態 badge），底部統計「共 N 筆 · 總金額 · 已付 · 未付」；IPC `customers:getStatement` / `suppliers:getStatement`
- **批次補貨點設定（Bulk Reorder Point）**：商品管理多選後，批次操作浮動列新增「設定補貨點」按鈕（`Target` icon）；點擊顯示 inline 數字輸入框，確認後以單一 SQL UPDATE 批次套用，成功後清空選取並顯示 toast
- **AI 套用建議補貨點（Apply AI Reorder Points）**：AI 需求預測頁面結果卡片新增「套用建議補貨點」按鈕，觸發 AlertDialog 確認後，將各商品 AI 預測 30 天需求量 × 50% 批次寫入 `reorder_pt`，呼叫 `products:batchUpdateReorderPt` IPC

### 技術細節

- `products:batchUpdate` IPC 擴充支援 `reorder_pt?: number` 參數
- 新增 `products:batchUpdateReorderPt(updates: { id, reorder_pt }[])` IPC handler，以 `db.transaction()` 批次執行
- `PurchaseForm` / `SaleForm` items grid 由 6 欄擴為 7 欄（加入折扣欄）；`append` 預設值加入 `discount_pct: 0`；Tab 鍵自動新增列邏輯移至折扣欄
- Preload bridge、`global.d.ts` 同步新增 `getStatement`、`batchUpdateReorderPt` 型別宣告

---

## [v0.7.1] — 2026-03-16

### 修正

- **緊急修正：自動更新 owner 設定錯誤** — `electron-builder.config.ts` 的 `publish.owner` 由 `ruru-o` 更正為 `swiftruru`，修復「檢查更新」回傳 404 錯誤的問題

---

## [v0.7.0] — 2026-03-16

### 新功能

- **AI 需求預測獨立頁面**：側邊欄新增「AI 需求預測」入口（Brain icon），功能從 Dashboard widget 獨立為完整頁面；分析結果以表格完整呈現，含預估售完天數（< 7 天橘色警示）與各商品補貨建議原因
- **AI 結果持久化**：預測結果存入本地 SQLite（`ai_forecasts` 資料表），重啟 App 或再次進入頁面仍保留上次結果，不需重複呼叫 API
- **動態版本號**：右下角狀態列版本號改由 `package.json` 自動注入，不再寫死

### 改善

- **AI JSON 解析強化**：以 `indexOf` / `lastIndexOf` 取代 Regex 提取 JSON；`max_tokens` 提高至 4096，降低截斷機率
- **AI SQL 修正**：移除 `WHERE` 子句對聚合別名的錯誤引用（`SUM()` misuse）
- **自動更新 IPC 修正**：dev 模式下 `updater:checkForUpdates` 不再拋出「no handler」錯誤

### 無障礙（WCAG 2.1 / 2.2）

系統性實作 99 項 WCAG 無障礙規則，涵蓋表格語意、鍵盤導航、表單關聯、焦點管理、螢幕閱讀器公告、系統主題整合等完整無障礙支援。

---

## [v0.6.0] — 2026-03-15

### 新功能

- **自動更新**：透過 GitHub Releases 自動偵測並安裝新版本；App 啟動 30 秒後背景靜默檢查，有更新時在設定頁顯示版本號與下載進度條，下載完成後可一鍵安裝並重啟
- **可自訂 G+key 快捷鍵**：所有導覽快捷鍵（G+H/P/B/S/R/,…）現可在設定頁逐一修改，Sidebar hover 時顯示對應快捷鍵提示，支援「恢復預設」
- **頂部導航進度條（NavProgressBar）**：任何資料請求進行中時，頁面頂部顯示 2px 藍色進度條
- **一鍵複製（CopyButton）**：SKU、訂單號、聯絡資訊欄位右側新增複製 icon
- **懸停快速預覽卡（Hover Preview Card）**：供應商/客戶名稱 hover 顯示聯絡資訊卡片
- **分類自訂顏色（Category Color Map）**：商品分類 Badge 依 hash 自動對應 6 色，Dashboard 庫存分佈圖同步套用
- **批次匯出選取列 CSV**：多選後浮動操作列新增「匯出選取」，純前端生成含 BOM 的 CSV
- **DataTable 鍵盤導航**：↑↓ Arrow 移動、Enter 開啟詳情、Home/End 跳到首末列
- **DataTable 密度切換**：三段密度（緊密／標準／寬鬆）獨立儲存
- **搜尋框最近搜尋記錄**：聚焦時顯示最近 8 筆歷史下拉選單
- **成功操作動畫回饋（Flash）**：新增/更新後對應列閃現綠色背景動畫
- **Dashboard KPI Count-Up 動畫**：KPI 數值以 ease-out 曲線動畫到目標值
- **訂單快速備註（Quick Note Popover）**：Row Actions 新增 inline Popover 快速新增備註
- **SKU 快速掃描列**：表單明細表格上方 SKU 輸入列，精確比對後自動 append，支援條碼掃描器
- **Tab 鍵自動新增明細列**：最後一行最後欄按 Tab 自動新增新列
- **頁面資料摘要列（Page Summary Strip）**：表格上方即時統計（總數、低庫存數、總金額等）
- **日期區間快選按鈕**：「今天／本週／本月／上月／近90天」快選 chip
- **點擊狀態快速篩選**：採購/銷售狀態 badge 可直接點擊套用篩選
- **可互動 Summary Chips**：「N 項低庫存」、「N 筆待處理」、「N 筆逾期」均為可點擊篩選 chip
- **庫存盤點 N 鍵快速新增**：StockTake 頁面補齊 N 鍵快速建立盤點單

### 無障礙（Accessibility / WCAG AA）

- aria-current="page"、useFocusReturn、aria-sort、role="grid"、aria-busy
- 系統深淺色主題即時同步（nativeTheme.on('updated')）
- Status badge sr-only 文字前綴、CreatableSelect 完整 ARIA combobox
- Context Menu 鍵盤開啟（Shift+F10）、路由切換後自動聚焦主內容
- prefers-contrast CSS 強化、rem 字型基礎、prefers-reduced-motion 動畫停用

### UX 修復

- 修正 Dashboard「隱藏」按鈕被卡片內容覆蓋
- 修正多處 TypeScript 型別錯誤與 lint 警告

---

## [v0.5.0] — 2026-03-15

### 新功能

- **帳款管理**：應收 / 應付帳款統一頁面、帳齡分析（4 色段）、即將到期提醒（7 天內）、訂單詳情標記付款按鈕
- **信用額度**：供應商 / 客戶 `credit_limit` 欄位、客戶詳情進度條、建單時超額警告
- **商品圖片**：拖放上傳、縮圖顯示、詳情 Dialog 放大預覽
- **AVCO 成本**：加權平均成本自動更新，毛利計算更準確
- **部分退貨**：銷售單 `partial_return` 狀態與工作流
- **AI 需求預測**：呼叫 Claude Haiku 分析近 30 天銷售，給出補貨建議（需 API Key）
- 報表強化：ABC 分析、損益表、商品批次調價

### 問題修復

- 修正 Migration 014 / 015 / 016 未註冊（`credit_limit`、`partial_return` 欄位不存在）
- 修正通知中心從未顯示低庫存通知
- 修正 `payment_due_date` 為 null 時 Dashboard 崩潰

### UX 改善

- Header 低庫存 badge 改為可點擊，直接跳至商品頁低庫存篩選
- Demo 資料產生全面更新：帳款情境、信用額度、盤點記錄、部分退貨
- Skill 從 15 個擴充至 19 個

---

## [v0.4.2] — 2026-03-10

### 問題修復

- 修正 About 面板仍顯示 Electron 預設圖示的問題（移除非正方形 `iconPath`，改由已替換的 bundle icon 提供）

### 其他

- 重構 Changelog 結構：每個版本獨立存放於 `changelog/vX.Y.Z.md`
- GitHub Release 說明改為只顯示當次版本內容
- 更新 `.github/workflows/release.yml`，`body_path` 指向對應版本的 changelog 檔案

---

## [v0.4.1] — 2026-03-10

### 問題修復

#### macOS 開發模式顯示名稱修正

- 修正 macOS 選單列左上角顯示「Electron」而非「SkillCraft IMS」的問題
- 修正 Dock tooltip 顯示「Electron」的問題（根本原因：Dock 讀取 `.app` 資料夾名稱）
- 修正 About 面板（關於 SkillCraft IMS）顯示 Electron 預設圖示的問題

### 技術改動

- 新增 `scripts/patch-electron-name.js`：postinstall 腳本，自動 patch `node_modules/electron/dist/` 下的 Electron bundle
  - 將 `Electron.app` 資料夾改名為 `SkillCraft IMS.app`
  - 更新 `electron/path.txt` 指向新路徑
  - 修改 `Info.plist` 的 `CFBundleDisplayName`、`CFBundleName`、`LSDisplayName`
  - 將 `resources/icon.icns` 複製覆蓋 bundle 內的 `electron.icns`，使 About 面板顯示正確圖示
- `package.json` postinstall 指令串接 patch 腳本：`electron-rebuild ... && node scripts/patch-electron-name.js`

---

## [v0.4.0] — 2026-03-10

### 新功能

#### 特色功能導覽（UX Tour）
- 點擊 Header「特色 Demo」按鈕啟動 12 步驟 Spotlight 導覽
- 每個步驟自動導覽至對應頁面，並以脈動光圈圈出目標元件
- 浮動 Tooltip 附設計原則說明（Keyboard-first、Proactive UX 等），支援中英切換
- 涵蓋：快捷鍵面板、Command Palette、主題切換、低庫存警示、快速採購、自動 SKU、訂單複製、日期篩選、逾期標示、報表自訂範圍、通知中心、盤點差異圖

#### 一鍵 Demo 資料產生
- 設定頁面新增「Demo 資料產生」卡片
- 支援三種規模：S（8 商品 / 40 採購 / 80 銷售）、M（50 / 80 / 160，預設）、L（100 / 150 / 300）
- 支援三種庫存情境：正常庫存 / 低庫存警示（30% 低庫存）/ 壓力測試（20% 零庫存）
- 生成 8 家供應商、12 位客戶、5 大商品分類（64 種商品池），訂單以二次方偏移分布產生近期密集資料
- 清除現有資料並以單一 Transaction 寫入，顯示生成結果統計

#### 平台感知快捷鍵顯示
- 新增 `platform.ts` 工具，透過 `navigator.platform` 偵測作業系統
- Header 搜尋欄 badge 自動顯示 `⌘K`（Mac）或 `Ctrl+K`（Windows）
- 快捷鍵說明面板（`?` 鍵）依平台顯示正確修飾鍵

### 問題修復
- 修正 `purchase_orders` / `sales_orders` 的 CHECK constraint 未包含 `'returned'`，導致產生退貨狀態資料時報錯（新增 Migration 010 重建表格）
- 修正快捷鍵說明面板在 Windows 同時顯示 `⌘K` 與 `Ctrl+K` 兩個 badge 的問題

### 其他
- 全面 i18n 審計：修正所有頁面硬寫的中文字串，確保中英切換完整覆蓋
- DataTable 分頁列「第 X / Y 頁　共 N 筆」改為 i18n 翻譯，支援中英切換
- 新增 LICENSE（MIT）檔案
- README 全面更新：補充 Live Demo 8 步驟表格、UX Tour 12 亮點列表、Demo 資料產生詳細說明

### 技術改動
- 新增 src/main/ipc/mockdata.ipc.ts：mockdata:generate IPC handler，含完整的清除→生成 Transaction
- 新增 src/renderer/src/lib/platform.ts：isMac / modKey 平台偵測工具
- translations.ts 新增約 150 個翻譯 Key
- preload/index.ts 補上 mockData.generate() IPC bridge
- global.d.ts 補上 mockData.generate() 型別宣告

---

## [v0.3.0] — 2026-03-09

### 新功能

#### 銷售退貨
- 已完成的銷售單新增「退貨」按鈕（橘色 Undo 圖示），點擊後彈出確認對話框
- 退貨自動回補所有品項庫存，並寫入庫存異動記錄（原因：退貨入庫）
- `returned` 為終態，無法再次操作；PDF 狀態標籤顯示橘色「已退貨」

#### 側欄數字徽章
- 商品列表顯示低庫存商品數量（黃色背景）
- 採購管理顯示待處理採購單數量（主色調背景）
- 銷售管理顯示待完成訂單數量（主色調背景）
- 徽章數值為 0 時自動隱藏，不佔用視覺空間

#### 停滯品分析（Slow-Moving Inventory）
- 報表頁面新增「停滯品分析」卡片
- 可切換 30 / 60 / 90 天篩選，列出超過指定天數未異動的商品
- 天數越長顯示越深警示色（30天→黃色，60天→橘色，90天→紅色）
- 卡片底部顯示停滯庫存總值

#### 商品詳情彈窗
- 點擊商品名稱開啟詳情彈窗（`ProductDetailDialog`）
- 顯示庫存數量、庫存價值、毛利率、歷史異動次數四個 KPI 卡片
- 含近 30 天每日庫存淨變化長條圖（綠色入庫 / 紅色出庫）
- 下方列出完整異動歷史記錄

#### 庫存異動歷史日期篩選
- 庫存異動歷史頁面新增「開始日期」/「結束日期」篩選欄
- 日期範圍可單獨設定或組合使用，輸入後自動重新查詢
- 提供快速清除（×）按鈕

#### 關於頁面動態版本號
- About 頁面版本號改為從 app 動態讀取，不再寫死字串

### 技術改動
- `reports:kpis` IPC 新增 `pendingPurchasesCount` 欄位
- `reports:slowMoving` 新增 IPC handler，接受 `days` 參數
- `sales:return` 新增 IPC handler，含 SQLite transaction 原子操作
- `products:getAllAdjustments` 新增 `dateFrom` / `dateTo` 篩選參數
- `settings:get` 回傳值新增 `appVersion: app.getVersion()`
- `SalesOrder.status` 型別更新為 `'pending' | 'completed' | 'cancelled' | 'returned'`
- 新增 `SlowMovingItem` interface

---

## [v0.2.0] — 2026-03-09

### 新功能

#### Live Demo 模式
- 點擊 Header「Live Demo」按鈕啟動 7 步驟互動式引導
- Typewriter 逐字動畫填入表單，自動完成商品建立 → 採購收貨 → 銷售出貨全流程
- Spotlight 光暈高亮指定操作按鈕，視覺引導使用者點擊
- 結束後保留 Demo 資料供觀察；下次啟動時自動清除所有 Demo 標記資料

#### 多語言支援
- 新增繁體中文 / English 切換（Header 右上角一鍵切換，所有頁面即時更新）
- 語言偏好記憶至 localStorage，重啟自動套用

#### 智慧補貨建議
- Dashboard 新增補貨建議卡片，自動列出庫存低於補貨點的商品
- 可勾選要採購的品項，一鍵建立採購單並顯示預估費用
- 補貨演算法：`suggested_qty = MAX(reorder_pt × 2 - stock_qty, reorder_pt)`

#### 低庫存桌面通知
- App 啟動時自動檢查低庫存，有警示立即跳出系統通知
- 確認出貨後若售出商品跌破補貨點，即時推送通知（含商品名稱與剩餘數量）
- 每天 09:00 自動推送每日庫存摘要（低庫存數量、待處理訂單）

#### PDF 美化
- 採購單 / 銷售單 PDF 全新設計：公司標頭、彩色狀態標籤、斑馬紋表格、底部簽名欄
- 設定頁面可填入公司名稱、地址、聯絡電話，自動帶入所有列印文件

#### 銷售建單庫存警示
- 新增銷售單時，若選取商品數量超過現有庫存，即時顯示紅框警示與剩餘數量
- 有庫存不足項目時禁止送出，防止超賣

### 問題修復
- 修正設定頁面公司資訊與 Google Sheets 表單共用 `useForm` 導致儲存失敗的問題
- 修正設定儲存後未呼叫 `invalidateQueries`，導致重新開啟頁面顯示舊快取的問題
- 修正 Live Demo 重複執行時 SKU UNIQUE constraint 錯誤
- 修正 Demo 結束後採購 / 銷售管理出現無名稱孤兒資料的問題（新增 `demo:purge` IPC 繞過訂單狀態限制直接刪除）
- 修正 Windows 打包時 `icon.ico` 缺少 256×256 尺寸的問題

### 技術改動
- 新增 `demo.ipc.ts`：以原始 SQL 強制刪除所有 Demo 標記資料，繞過 model 層狀態限制
- 新增 `purgeDemoData()` 共用工具函式，統一在 App 啟動 / Demo 開始 / Demo 結束三個時機執行清理
- 新增 `DemoController`、`DemoFormOverlay`、`LiveDemoOverlay` 元件
- 新增 `demo.store.ts`（Zustand）管理 Demo 狀態與 Spotlight 高亮
- 新增 `translations.ts` i18n 字串表、`lang.store.ts`、`useLang()` hook
- `global.d.ts` 補上 `demo.purge()` 型別宣告
- `icon.ico` 重新生成，包含 256 / 128 / 64 / 48 / 32 / 16 六個尺寸

---

## [v0.1.0] — 初始版本

- 商品管理（SKU、分類、進售價、庫存、補貨點）
- 採購管理（建立採購單、確認收貨、供應商管理）
- 銷售管理（建立銷售單、確認出貨、客戶管理）
- 庫存盤點（建立盤點單、完成後自動差異調整）
- 庫存異動歷史（完整紀錄、CSV 匯出）
- 報表分析（銷售趨勢折線圖、庫存分佈長條圖、低庫存警示、KPI 卡片）
- Google Sheets 雙向同步（Service Account 認證、自動排程）
- 深淺色主題切換
- 全域搜尋（⌘K）
- PDF 列印採購單 / 銷售單
- CSV 匯出（商品、採購、銷售、庫存異動）
- CSV 匯入商品資料
- 資料庫備份 / 還原
