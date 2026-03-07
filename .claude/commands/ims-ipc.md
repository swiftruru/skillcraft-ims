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
