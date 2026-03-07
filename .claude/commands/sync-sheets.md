# sync-sheets

> 操作、監控與診斷 Google Sheets 雙向同步，並引導首次設定。

## 說明

此 Skill 提供完整的 Google Sheets 同步管理功能，
包含手動觸發、狀態查詢、錯誤診斷、及初次設定引導。

## 使用方式

在 Claude Code 中輸入：`/sync-sheets`

---

## 執行步驟

1. **詢問使用者需要什麼**

   顯示選單：
   ```
   Google Sheets 同步管理
   ─────────────────────
   A) 手動觸發同步（推送 / 拉取 / 雙向）
   B) 查看同步狀態與近期日誌
   C) 診斷同步錯誤
   D) 首次設定引導（Google Cloud 設定）
   ```

---

### 選項 A：手動觸發同步

詢問方向：推送（本機 → Sheets）/ 拉取（Sheets → 本機）/ 雙向

```bash
DB=~/Library/Application\ Support/skillcraft-ims/ims.db

# 查看目前設定
sqlite3 "$DB" "
SELECT key, value FROM app_settings
WHERE key IN ('googleSheetId', 'serviceAccountKeyPath', 'autoSyncEnabled')
" -column -header
```

若設定已存在，提示使用者在 app 內點擊「同步 Sheets」按鈕，
或透過以下 Node.js 腳本觸發（需要 app 執行中）：

```bash
# 確認 app 是否在執行
pgrep -f "SkillCraft IMS" && echo "App 執行中" || echo "App 未執行，請先啟動 app"
```

若 app 未執行，提示到 app 的設定頁面中點擊「測試連線」再手動同步。

---

### 選項 B：查看同步狀態

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
SELECT
  status,
  COUNT(*) as count,
  MAX(synced_at) as last_occurrence
FROM sync_log
GROUP BY status
ORDER BY count DESC
" -column -header
```

以人類可讀方式呈現：最後同步時間、成功率、常見錯誤類型。

---

### 選項 C：診斷同步錯誤

```bash
# 查看最後一個錯誤
sqlite3 "$DB" "
SELECT synced_at, direction, message
FROM sync_log
WHERE status = 'error'
ORDER BY synced_at DESC
LIMIT 5
" -column -header
```

常見錯誤分析與解決方案：

| 錯誤關鍵字 | 原因 | 解決方法 |
|---|---|---|
| `ENOENT` / `no such file` | Service Account JSON 路徑錯誤 | 在設定頁面更新路徑 |
| `invalid_grant` | Service Account 金鑰過期或無效 | 重新下載金鑰檔案 |
| `PERMISSION_DENIED` | Sheet 未分享給 Service Account | 在 Google Sheet 設定分享 |
| `Quota exceeded` | API 配額超限 | 降低同步頻率或等待重置 |
| `未初始化` | 設定頁面未填入 credentials | 開啟 app → 設定頁面填入 |
| `Sheet not found` | Sheet ID 錯誤 | 確認 URL 中的 Sheet ID |

---

### 選項 D：首次設定引導

引導完整的 Google Cloud 設定流程：

**步驟 1：建立 Google Cloud 專案**
1. 前往 https://console.cloud.google.com
2. 建立新專案，名稱：`skillcraft-ims`
3. 記錄專案 ID

**步驟 2：啟用 Google Sheets API**
1. APIs & Services → Library
2. 搜尋 "Google Sheets API"
3. 點擊 Enable

**步驟 3：建立 Service Account**
1. IAM & Admin → Service Accounts → Create Service Account
2. 名稱：`skillcraft-ims-sync`
3. 角色：Editor（或 Sheets API 最小權限）
4. 建立 JSON 金鑰：Keys → Add Key → JSON → Download

**步驟 4：儲存金鑰**
```bash
mkdir -p ~/.config/skillcraft-ims
mv ~/Downloads/your-key.json ~/.config/skillcraft-ims/service-account.json
```

**步驟 5：建立並分享 Google Sheet**
1. 在 Google Drive 建立新試算表
2. 複製 URL 中的 Sheet ID（`/d/[這段就是ID]/edit`）
3. 分享給 Service Account 的 email（Editor 權限）

**步驟 6：在 App 設定頁面**
- Sheet ID：貼上步驟 5 的 ID
- Key 路徑：`~/.config/skillcraft-ims/service-account.json`
- 點擊「測試連線」確認成功
- 點擊「初始化 Sheet」建立標題欄位

```bash
# 驗證金鑰檔案
cat ~/.config/skillcraft-ims/service-account.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('Email:', d.get('client_email'))
print('Project:', d.get('project_id'))
print('Type:', d.get('type'))
"
```
