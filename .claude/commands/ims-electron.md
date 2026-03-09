---
name: ims-electron
description: 當使用者要求新增或修改 Electron 主程序功能，如視窗管理、系統通知、app 生命週期或原生 API 整合時觸發。
---

## Electron 主程序開發規範

1. **通知只在 ready-to-show 後發送**：使用 Electron `Notification` API 時，必須在 `mainWindow.on('ready-to-show')` callback 內呼叫，確保視窗已顯示才推送通知，不在 `app.whenReady()` 的頂層直接呼叫：

   ```typescript
   mainWindow.on('ready-to-show', () => {
     mainWindow!.show()
     checkLowStockNotification()  // 在視窗顯示後才通知
   })
   ```

2. **通知前必須檢查支援性**：每次使用 `Notification` 前先呼叫 `Notification.isSupported()`，並以 try/catch 包裹，通知失敗不影響主程序運作：

   ```typescript
   function checkLowStockNotification(): void {
     if (!Notification.isSupported()) return
     try { ... } catch { /* silent */ }
   }
   ```

3. **低庫存通知規則**：啟動時檢查低庫存，依嚴重程度組成不同訊息：
   - `stock_qty === 0` 的商品數量 > 0：說明有幾項已售完
   - 其餘低庫存：說明低於補貨點的商品數量
   - 若無低庫存商品，不發送通知

4. **Main process 禁止直接 import renderer 模組**：`src/main/` 中的程式碼禁止 import `src/renderer/` 的任何模組，資料共享只能透過 contextBridge IPC。

5. **Model 只在 main process 使用**：`ProductModel`、`SupplierModel` 等 DB model 只能在 `src/main/` 中呼叫，renderer 必須透過 `window.electronAPI` 取得資料，不直接存取 DB。

6. **視窗狀態**：`mainWindow` 以模組層級變數管理，透過 `getMainWindow()` 導出供其他 main process 模組（如 IPC handler 需要推送事件至 renderer）使用，避免循環 import。

7. **視窗狀態持久化**：視窗尺寸與位置以 JSON 存在 `app.getPath('userData')/window-state.json`；`createWindow` 時讀取套用，`mainWindow.on('close')` 時寫入；若存檔不存在使用預設值（1280×800）；maximized 狀態另外處理（先 setBounds 再 maximize()）。

8. **排程每日通知**：SchedulerService 除了同步排程外，另起一個 `'0 9 * * *'` cron job（每天早上 9 點）發送庫存摘要通知；此排程不依賴 autoSyncEnabled 設定，無條件啟動；通知內容包含低庫存數量與待處理訂單數量。

10. **庫存預警自動通知**：`sales:complete` 後檢查售出品項庫存，若有商品跌至補貨點以下，除 OS Notification 外，必須同時呼叫 `insertNotification` 寫入 `app_notifications`：
    - import：`import { insertNotification } from './notifications.ipc'`
    - type：`'low_stock'`；title：`'⚠️ 庫存預警'`；body：`'${name} 庫存剩 ${stock_qty}，低於補貨點 ${reorder_pt}'`（每個品項各寫一筆）；link：`'/products'`
    - 上限：每次最多寫 5 筆，避免同一批銷售大量寫入通知

9. **定期自動備份規範**：`SchedulerService` 新增自動備份 cron job：
   - 排程設定：`backupSchedule`（預設 `'0 2 * * *'` 每天凌晨 2 點），由 `app_settings` 中 `autoBackupEnabled`（`'true'`/`'false'`）控制是否啟動
   - 備份路徑：`app.getPath('documents')/SkillCraft IMS Backups/ims-backup-YYYY-MM-DD.db`；超過 30 天的備份自動刪除（`fs.readdirSync` 掃目錄後 `fs.unlinkSync`）
   - IPC：`db:autoBackup` 觸發一次立即備份（手動觸發，回傳 `{ success, filePath, error }`）
   - Settings 頁面新增「自動備份」開關（shadcn Switch）+ 說明文字「每日凌晨 2 點自動備份，保留 30 天」；開關狀態存入 `app_settings(key='autoBackupEnabled', value='true'/'false')`
   - 排程啟動/停止：`settings:set autoBackupEnabled` 觸發後，main process 透過 `ipcMain.on` 收到，動態重啟 SchedulerService 的備份 cron（`job.stop()` 後 `schedule(cron, fn)`）
