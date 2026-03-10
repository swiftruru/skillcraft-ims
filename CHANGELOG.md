# Changelog

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
