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
