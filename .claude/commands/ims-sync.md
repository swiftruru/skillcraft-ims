---
name: ims-sync
description: 當使用者要求新增或修改 Google Sheets 同步邏輯、Service Account 設定或排程功能時觸發。
---

## Google Sheets 同步開發規範

1. **Service Account 認證**：所有 Google Sheets API 呼叫必須使用 Service Account JSON 金鑰認證，不使用 OAuth2 user flow。金鑰路徑從 `app_settings` 資料表讀取，並透過 `homedir()` 展開 `~` 開頭的路徑。

2. **同步方向規則**：
   - `Products` 分頁：雙向同步，以 `updated_at` 時間戳決定誰的資料較新
   - `Purchase Orders`、`Sales Orders`、`Reports` 分頁：僅推送（local → Sheets），不拉取
   - 時間戳相同時：local 資料優先（offline-first）

3. **衝突解決函式**：實作 `resolveConflict(localRow, sheetRow)` 時，比較 `updated_at` 欄位，回傳較新的一方，相同時回傳 `localRow`。

4. **同步日誌必寫**：每次同步結束（成功或失敗）必須寫入 `sync_log` 資料表，包含 `direction`、`status`（`'success'` | `'error'`）、`records_synced`、`message` 欄位。

5. **初始化 Sheet 結構**：首次同步前必須呼叫 `initializeSheetHeaders()` 確認各分頁的標題列已存在，若不存在則自動建立，避免資料寫入錯誤欄位。

6. **排程設定**：`node-cron` 排程預設每 30 分鐘執行一次（`'*/30 * * * *'`），僅在 `autoSyncEnabled === 'true'` 且 `googleSheetId` 與 `serviceAccountKeyPath` 都已設定時才啟動。
