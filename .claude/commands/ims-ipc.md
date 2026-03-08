---
name: ims-ipc
description: 當使用者要求新增 Electron IPC 功能、修改 preload bridge 或在 renderer 呼叫主程序功能時觸發。
---

## Electron IPC 開發規範

1. **三層同步原則**：新增任何 IPC 功能，必須同時修改三個檔案才算完成：
   - `src/main/ipc/xxx.ipc.ts` — 用 `ipcMain.handle` 註冊 handler
   - `src/preload/index.ts` — 在 `contextBridge.exposeInMainWorld` 的對應物件中新增方法
   - `src/renderer/src/types/global.d.ts` — 新增對應的 TypeScript 型別宣告

2. **禁止直接 import**：renderer 程式碼（`src/renderer/`）嚴禁直接 import 任何 `src/main/` 或 Node.js 模組（`fs`、`path`、`better-sqlite3` 等），只能透過 `window.electronAPI` 呼叫。

3. **Channel 命名格式**：IPC channel 名稱使用 `domain:action` 格式，例如 `products:getAll`、`purchases:create`、`sync:trigger`，禁止使用隨意字串。

4. **錯誤傳遞**：`ipcMain.handle` 內的 `try/catch` 必須 `throw error`（不可 `return null`），讓 renderer 的 `await window.electronAPI.xxx()` 能正確捕捉到錯誤訊息。

5. **型別共享**：IPC 傳遞的資料型別（如 `Product`、`SalesOrder`）定義在 `src/renderer/src/types/schema.ts`，main 與 renderer 兩側都使用此型別，不重複定義。

6. **資料庫備份/還原**：`db:backup` 用 `dialog.showSaveDialog` 取得路徑後 `fs.copyFileSync`；`db:restore` 用 `dialog.showOpenDialog` 選檔後 `fs.copyFileSync` 覆蓋現有 DB，再 `app.relaunch(); app.exit(0)` 重啟；兩者都回傳 `{ success, filePath?, error? }`；dbPath 由 main process 計算，不由 renderer 傳入。

7. **CSV 匯入**：channel 為 `import:csv`，用 `dialog.showOpenDialog({ filters: [{ name: 'CSV', extensions: ['csv'] }] })` 讓使用者選檔；主程序讀取並解析 CSV（不依賴第三方 CSV 套件，手動 split），欄位映射在主程序完成；以 `db.transaction()` 批次 upsert（`ON CONFLICT(sku) DO UPDATE SET ...`）；回傳 `{ success, imported, skipped, errors: string[] }`；超過 50 筆時先自動備份 DB；renderer 不傳入路徑，路徑由 dialog 取得。

8. **PDF 列印**：channel 為 `print:pdf`，接受 `{ type: 'sales' | 'purchase', id: number }`；主程序查詢 DB 取得訂單與明細，產生 HTML 字串，建立隱藏 BrowserWindow（`show: false`）載入 HTML data URL，呼叫 `webContents.printToPDF({ marginsType: 1, pageSize: 'A4' })`，再用 `dialog.showSaveDialog` 讓使用者選儲存路徑（預設檔名 `{order_no}.pdf`），寫入 PDF；BrowserWindow 用完立即關閉；回傳 `{ success: boolean; filePath?: string; error?: string }`。
