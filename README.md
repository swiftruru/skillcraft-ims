# SkillCraft IMS 進銷存管理系統

[![Electron](https://img.shields.io/badge/Electron-34-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://www.sqlite.org/)
[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-API-34A853?logo=google-sheets)](https://developers.google.com/sheets)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 跨平台桌面進銷存管理系統，整合 Claude Code AI Skill、Google Sheets 雲端同步，
> 展示「高等程式語言與軟體設計」課程三個核心方向的完整整合。

---

## 功能特色

### 核心進銷存功能
- **商品管理** — SKU、分類、進售價、庫存、補貨點警示
- **採購管理** — 採購單建立、確認收貨（自動更新庫存）、供應商管理
- **銷售管理** — 銷售單建立、完成銷售（事務性庫存扣除）、客戶管理
- **報表分析** — 銷售趨勢、庫存分佈、產品銷售排行、低庫存警示

### AI Skills（LLM 機制）
透過 Claude Code 的 Skill 系統，直接對 SQLite 資料庫執行查詢並產生智慧分析：

| Skill 指令 | 功能 |
|---|---|
| `/inventory-report` | AI 驅動的庫存分析報告（類別分佈、利潤分析、建議） |
| `/reorder-alert` | 低庫存偵測 + EOQ 補貨量計算 + 草稿採購單 |
| `/sales-analysis` | 銷售趨勢、產品績效矩陣、客戶洞察 |
| `/import-data` | 引導 CSV 欄位映射 + 事務性批次匯入 |
| `/sync-sheets` | Google Sheets 同步操作、日誌查看、錯誤診斷 |

### Google Sheets 整合
- **雙向同步**（商品）：以 `updated_at` 時間戳決定版本，offline-first 設計
- **推送同步**（採購單、銷售單、每日報表快照）
- **自動排程**：可設定每 N 分鐘自動同步
- **Service Account 認證**：無需 OAuth2 流程，適合桌面應用

---

## 技術架構

```
┌─────────────────────────────────────────────┐
│             Renderer (React 19)              │
│  Dashboard │ Products │ Purchases │ Sales    │
│  Recharts 圖表 │ shadcn/ui 元件              │
├─────────────────────────────────────────────┤
│         contextBridge (Type-Safe IPC)        │
├──────────────┬──────────────────────────────┤
│  Main Process│  Services                    │
│  better-sqlite3 │  GoogleSheetsService      │
│  IPC Handlers│  SyncService + node-cron     │
└──────────────┴──────────────────────────────┘
```

### 技術棧

| 層次 | 技術 |
|------|------|
| 桌面框架 | Electron 34 + electron-vite |
| 前端 | React 19 + TypeScript + Vite |
| 樣式 | Tailwind CSS v3 + Radix UI |
| 資料庫 | SQLite（better-sqlite3）|
| 雲端同步 | Google Sheets API v4（Service Account）|
| 狀態管理 | Zustand + TanStack React Query |
| 圖表 | Recharts |
| 表單 | react-hook-form + Zod |
| 排程 | node-cron |

---

## 快速開始

### 需求
- Node.js 20+
- Python 3.x（用於 better-sqlite3 編譯）

```bash
# 1. 安裝相依套件
npm install --ignore-scripts

# 2. 編譯 SQLite native module
npx @electron/rebuild -f -w better-sqlite3

# 3. 啟動開發模式
npm run dev
```

### 打包發佈
```bash
npm run package
# 輸出至 release/ 目錄
# macOS: release/*.dmg
# Windows: release/*.exe
```

---

## Google Sheets 設定

詳細步驟請參閱 [docs/google-cloud-setup.md](docs/google-cloud-setup.md)

快速摘要：
1. 建立 Google Cloud 專案並啟用 Sheets API
2. 建立 Service Account 並下載 JSON 金鑰
3. 建立 Google Sheet 並分享給 Service Account
4. 在 app 設定頁面填入 Sheet ID 和金鑰路徑

---

## Claude Code Skills 使用

確保已安裝 Claude Code，在專案目錄內執行：

```bash
claude  # 進入 Claude Code
```

接著直接輸入 skill 指令，例如：

```
/inventory-report
```

更多 skill 說明請參閱 [docs/skill-guide.md](docs/skill-guide.md)

---

## 專案結構

```
skillcraft-ims/
├── .claude/skills/          # Claude Code AI Skills
├── docs/                    # 文件
├── src/
│   ├── main/                # Electron 主程序（Node.js）
│   │   ├── db/              # SQLite 連線、migrations、models
│   │   ├── ipc/             # IPC handlers
│   │   └── services/        # Google Sheets、同步、排程
│   ├── preload/             # contextBridge 安全橋接
│   └── renderer/            # React 應用
│       ├── src/pages/       # 各功能頁面
│       └── src/components/  # UI 元件
└── resources/               # App 圖示
```

---

## 學術背景

此專案為「**高等程式語言與軟體設計**」課程期末作業，
整合了課程提供的三個方向：

1. **LLM SKILL 機制** — 5 個 Claude Code skills，真實查詢 SQLite 資料庫
2. **GitHub + Google Sheet** — 完整 CI 流程 + Google Sheets API 雙向同步
3. **桌面進銷存系統** — Electron 跨平台應用，完整的採購銷售庫存管理

---

## 授權

MIT License — 詳見 [LICENSE](LICENSE)
