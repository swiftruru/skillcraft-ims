# 系統架構說明

## 整體架構

```
┌─────────────────────────────────────────────────────────────┐
│                     SkillCraft IMS                          │
├───────────────────────────┬─────────────────────────────────┤
│   Renderer Process        │   Main Process                  │
│   (React + TypeScript)    │   (Node.js + Electron)          │
│                           │                                 │
│  ┌─────────────────────┐  │  ┌──────────────────────────┐  │
│  │  React UI           │  │  │  IPC Handlers             │  │
│  │  - Dashboard        │  │  │  products, purchases,     │  │
│  │  - Products         │◄─┼──►  sales, reports, sync     │  │
│  │  - Purchases        │  │  └──────────┬───────────────┘  │
│  │  - Sales            │  │             │                   │
│  │  - Reports          │  │  ┌──────────▼───────────────┐  │
│  │  - Settings         │  │  │  SQLite Database          │  │
│  └─────────────────────┘  │  │  (better-sqlite3)         │  │
│                           │  │  - products               │  │
│  ┌─────────────────────┐  │  │  - suppliers              │  │
│  │  State Management   │  │  │  - customers              │  │
│  │  Zustand + R-Query  │  │  │  - purchase_orders        │  │
│  └─────────────────────┘  │  │  - sales_orders           │  │
│                           │  │  - sync_log               │  │
├───────────────────────────┤  └──────────┬───────────────┘  │
│  Preload Script           │             │                   │
│  contextBridge API        │  ┌──────────▼───────────────┐  │
│  (Type-Safe Bridge)       │  │  Services                 │  │
└───────────────────────────┘  │  GoogleSheetsService      │  │
                               │  SyncService              │  │
                               │  SchedulerService         │  │
                               └──────────┬───────────────┘  │
                                          │                   │
                               ┌──────────▼───────────────┐  │
                               │  Google Sheets API v4     │  │
                               │  (Service Account auth)   │  │
                               └──────────────────────────┘  │
└────────────────────────────────────────────────────────────-┘

┌─────────────────────────────────────────────────────────────┐
│                 Claude Code Skills Layer                     │
│   /inventory-report  /reorder-alert  /sales-analysis        │
│   /import-data  /sync-sheets                                │
│   ↓ 直接查詢 SQLite 資料庫（Bash + sqlite3 CLI）             │
└─────────────────────────────────────────────────────────────┘
```

---

## IPC 安全模型

Electron 的安全設計要求：Renderer（React）無法直接存取 Node.js API。
使用 `contextBridge` 建立型別安全的橋接介面：

```
Renderer        Preload         Main
  │               │              │
  │─electronAPI──►│              │
  │               │─ipcRenderer──►│
  │               │              │ (IPC Handler)
  │               │◄──result─────│
  │◄──result──────│              │
```

**安全設定**：
- `nodeIntegration: false`（Renderer 無法存取 Node.js）
- `contextIsolation: true`（Context 隔離）
- `sandbox: false`（Preload 可使用 Node.js API）

---

## 資料庫架構

### 實體關係圖

```
suppliers ──── purchase_orders ──── purchase_items ──── products
                                                            │
customers  ──── sales_orders   ──── sale_items ────────────┘
                                                            │
                                         sync_log          │
                                         app_settings      │
```

### 庫存一致性保證

採購收貨與銷售完成均使用 SQLite **事務（Transaction）**：

```sql
-- 完成銷售（原子操作）
BEGIN TRANSACTION;
  UPDATE sales_orders SET status = 'completed' WHERE id = ?;
  UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?;
  -- 若任何 stock_qty < 0，ROLLBACK
COMMIT;
```

---

## Google Sheets 同步設計

### 資料流

```
本機 SQLite                    Google Sheets
    │                              │
    ├── Products (雙向) ──────────►│ Products
    ├── Purchase Orders ──────────►│ Purchase Orders
    ├── Sales Orders ─────────────►│ Sales Orders
    └── Daily Report ─────────────►│ Reports
         │
         ◄── Products (pull) ──────┤
```

### 衝突解決策略（Products 雙向同步）

使用 `updated_at` 時間戳比較：

| 條件 | 結果 |
|------|------|
| 本機 `updated_at` > Sheets `Updated At` | 推送本機資料 |
| Sheets `Updated At` > 本機 `updated_at` | 拉取 Sheet 資料 |
| 時間相同 | 本機優先（offline-first 原則）|

---

## 專案目錄結構

```
src/
├── main/                    # Electron 主程序（Node.js）
│   ├── index.ts             # app 入口、BrowserWindow 建立
│   ├── db/
│   │   ├── index.ts         # SQLite 連線、WAL mode、migration runner
│   │   ├── migrations/      # SQL 遷移檔案
│   │   ├── models/          # 各實體的 CRUD 操作
│   │   └── schema.ts        # TypeScript 型別定義
│   ├── ipc/                 # IPC handlers（按功能分檔）
│   └── services/            # 商業邏輯服務
│       ├── googleSheets.service.ts
│       ├── sync.service.ts
│       └── scheduler.service.ts
├── preload/
│   └── index.ts             # contextBridge API（型別安全橋接）
└── renderer/
    └── src/
        ├── App.tsx           # 路由設定
        ├── pages/            # 各頁面元件
        ├── components/       # 可重用 UI 元件
        │   ├── layout/       # 版面元件
        │   ├── common/       # 共用元件（DataTable、Dialog 等）
        │   ├── products/     # 商品相關元件
        │   ├── purchases/    # 採購相關元件
        │   └── sales/        # 銷售相關元件
        ├── types/
        │   ├── global.d.ts   # window.electronAPI 型別宣告
        │   └── schema.ts     # 前端型別定義
        ├── lib/              # 工具函式
        └── styles/           # CSS / Tailwind
```
