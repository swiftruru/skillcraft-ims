---
name: sync-sheets
description: 當使用者要求同步 Google Sheets、查看同步狀態、診斷同步錯誤或設定 Google Cloud 憑證時觸發。
---

## Google Sheets 同步規範

1. **前置詢問**：開始前顯示選單，讓使用者選擇操作類型：手動同步、查看狀態、診斷錯誤、或首次設定引導。

2. **查看同步狀態**：從 SQLite 讀取設定與近期 20 筆同步日誌，以人類可讀方式呈現最後同步時間與成功率。

   ```bash
   DB=~/Library/Application\ Support/skillcraft-ims/ims.db

   echo "=== 同步設定 ===" && \
   sqlite3 "$DB" "SELECT key, value FROM app_settings" -column -header

   echo "" && echo "=== 近期 20 筆同步日誌 ===" && \
   sqlite3 "$DB" "
   SELECT synced_at, direction, status, records_synced, message
   FROM sync_log
   ORDER BY synced_at DESC
   LIMIT 20
   " -column -header

   echo "" && echo "=== 同步統計 ===" && \
   sqlite3 "$DB" "
   SELECT status, COUNT(*) as count, MAX(synced_at) as last_occurrence
   FROM sync_log
   GROUP BY status
   ORDER BY count DESC
   " -column -header
   ```

3. **錯誤診斷**：查詢最近 5 筆錯誤日誌，並依錯誤關鍵字提供對應解決方案。

   ```bash
   sqlite3 "$DB" "
   SELECT synced_at, direction, message
   FROM sync_log
   WHERE status = 'error'
   ORDER BY synced_at DESC
   LIMIT 5
   " -column -header
   ```

   | 錯誤關鍵字 | 原因 | 解決方法 |
   | --- | --- | --- |
   | `ENOENT` / `no such file` | Service Account JSON 路徑錯誤 | 在設定頁面更新路徑 |
   | `invalid_grant` | Service Account 金鑰過期或無效 | 重新下載金鑰檔案 |
   | `PERMISSION_DENIED` | Sheet 未分享給 Service Account | 在 Google Sheet 設定分享 |
   | `Quota exceeded` | API 配額超限 | 降低同步頻率或等待重置 |
   | `Sheet not found` | Sheet ID 錯誤 | 確認 URL 中的 Sheet ID |

4. **首次設定引導**：若使用者選擇設定引導，逐步說明 Google Cloud 專案建立、啟用 Sheets API、建立 Service Account、下載 JSON 金鑰、分享 Sheet 等步驟，並驗證金鑰內容。

   ```bash
   mkdir -p ~/.config/skillcraft-ims
   # 將下載的金鑰移至標準路徑
   mv ~/Downloads/your-key.json ~/.config/skillcraft-ims/service-account.json

   # 驗證金鑰檔案
   cat ~/.config/skillcraft-ims/service-account.json | python3 -c "
   import json, sys
   d = json.load(sys.stdin)
   print('Email:', d.get('client_email'))
   print('Project:', d.get('project_id'))
   print('Type:', d.get('type'))
   "
   ```

5. **手動同步**：若 app 正在執行，提示使用者在 app 設定頁面點擊「同步 Sheets」按鈕；若 app 未執行則提醒先啟動 app。

   ```bash
   pgrep -f "SkillCraft IMS" && echo "App 執行中，請在設定頁面點擊同步" || echo "App 未執行，請先啟動 app"
   ```
