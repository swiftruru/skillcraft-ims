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

## 學術背景

- **課程名稱**：高等程式語言與軟體設計
- **指導老師**：陳彥宏（YEN-HUNG CHEN）老師
- **專案性質**：期末作業，整合課程提供的三個核心方向：
  1. **LLM SKILL 機制** — 以 Claude Code Skill 定義開發規範，AI 依規範參與程式碼生成
  2. **GitHub + Google Sheet** — GitHub Actions CI 流程 + Google Sheets API 雙向同步
  3. **桌面進銷存系統** — Electron 跨平台應用，完整的採購銷售庫存管理

---

## 功能特色

### 核心進銷存功能
- **商品管理** — SKU、分類、進售價、庫存、補貨點警示
- **採購管理** — 採購單建立、確認收貨（自動更新庫存）、供應商管理
- **銷售管理** — 銷售單建立、完成銷售（事務性庫存扣除）、客戶管理
- **報表分析** — 銷售趨勢、庫存分佈、產品銷售排行、低庫存警示

### Google Sheets 整合
- **雙向同步**（商品）：以 `updated_at` 時間戳決定版本，offline-first 設計
- **推送同步**（採購單、銷售單、每日報表快照）
- **自動排程**：可設定每 N 分鐘自動同步
- **Service Account 認證**：無需 OAuth2 流程，適合桌面應用

---

## Claude Code Skills

本專案使用 Claude Code 的 **Skill 機制**將程式設計規範嵌入開發流程。
Skill 存放於 `.claude/commands/`，每個 Skill 檔案包含 YAML frontmatter 觸發條件，
當開發請求符合描述時，Claude Code 自動載入對應規範，約束程式碼生成行為。

### Skill 運作方式

```
開發者提出需求
      │
      ▼
Claude Code 比對所有 Skill 的 description
      │
      ▼
自動載入匹配的 Skill（可同時載入多個）
      │
      ▼
依 Skill 規範生成符合專案架構的程式碼
```

### 開發規範 Skills（6 個）

這些 Skill 定義了各層次的開發規則，確保 AI 生成的程式碼始終符合專案架構：

| Skill 檔案 | 觸發時機 | 規範重點 |
| --- | --- | --- |
| `ims-sqlite.md` | 新增/修改 DB 操作、Model、Migration | Transaction 強制要求、WAL 模式、庫存保護邏輯 |
| `ims-ipc.md` | 新增/修改 IPC 功能、preload bridge | 三層同步原則、Channel 命名、禁止直接 import |
| `ims-react.md` | 新增/修改 React 元件、表單、查詢 | React Query、react-hook-form + Zod、shadcn/ui |
| `ims-inventory.md` | 進貨、銷售、庫存異動業務邏輯 | 不可逆狀態、Transaction 結構、庫存扣減驗證 |
| `ims-sync.md` | Google Sheets 同步邏輯、排程設定 | 同步方向規則、衝突解決策略、同步日誌寫入 |
| `ims-report.md` | Dashboard、KPI 卡片、圖表、報表 | Recharts 規範、金額格式、React Query 快取 |

### Skill 檔案格式

每個 Skill 採用 YAML frontmatter 格式，`description` 欄位為觸發條件：

```markdown
---
name: ims-sqlite
description: 當使用者要求新增或修改資料庫操作、Model 函式、Migration SQL 或 IPC handler 時觸發。
---

## SQLite 開發規範

1. **Transaction 強制要求**：所有同時修改多張資料表的操作，必須包在 `db.transaction()` 內...
2. **庫存扣減保護**：銷售操作扣減前必須先確認庫存充足，不足時 throw Error...
```

### 使用方式

在專案目錄內啟動 Claude Code：

```bash
claude
```

開發時直接提出需求，Claude Code 自動偵測並套用對應 Skill：

```text
> 幫我新增一個「調整庫存」的 IPC handler
  → 自動載入 ims-ipc（三層同步、Channel 命名規範）
  → 自動載入 ims-sqlite（Transaction、WAL 模式規範）
  → 依規範生成符合專案架構的程式碼
```

> 詳細 Skill 規範內容請參閱 [.claude/commands/](.claude/commands/)

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
| --- | --- |
| 桌面框架 | Electron 34 + electron-vite |
| 前端 | React 19 + TypeScript + Vite |
| 樣式 | Tailwind CSS v3 + Radix UI |
| 資料庫 | SQLite (better-sqlite3) |
| 雲端同步 | Google Sheets API v4 (Service Account) |
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

# 3. 下載 Electron 執行檔（首次需要）
node node_modules/electron/install.js

# 4. 啟動開發模式
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
4. 在 app 設定頁面填入 Sheet ID 和金鑰路徑（支援 `~` 展開，如 `~/.config/skillcraft-ims/service-account.json`）

---

## 專案結構

```text
skillcraft-ims/
├── .claude/
│   └── commands/            # Claude Code Skills（6 個開發規範）
│       ├── ims-sqlite.md    # SQLite / Model 開發規範
│       ├── ims-ipc.md       # Electron IPC 開發規範
│       ├── ims-react.md     # React 元件開發規範
│       ├── ims-inventory.md # 庫存業務邏輯規範
│       ├── ims-sync.md      # Google Sheets 同步規範
│       └── ims-report.md    # 報表與 Dashboard 規範
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

## 授權

MIT License — 詳見 [LICENSE](LICENSE)
