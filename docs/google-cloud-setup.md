# Google Cloud 設定指南

本文件說明如何設定 Google Sheets API Service Account 以啟用 SkillCraft IMS 的雲端同步功能。

---

## 步驟 1：建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 點擊頂部選單的專案選擇器 → **新增專案**
3. 專案名稱：`skillcraft-ims`（或任意名稱）
4. 點擊 **建立**，等待專案建立完成

---

## 步驟 2：啟用 Google Sheets API

1. 在左側選單：**APIs & Services** → **程式庫**
2. 搜尋 `Google Sheets API`
3. 點擊結果中的 **Google Sheets API**
4. 點擊 **啟用**

---

## 步驟 3：建立 Service Account

1. 在左側選單：**IAM 與管理** → **服務帳戶**
2. 點擊 **建立服務帳戶**
3. 填入：
   - **名稱**：`skillcraft-ims-sync`
   - **說明**：`SkillCraft IMS Google Sheets sync account`
4. 點擊 **建立並繼續**
5. **角色**：選擇 **編輯者**（Editor）或直接點擊繼續跳過
6. 點擊 **完成**

---

## 步驟 4：建立並下載 JSON 金鑰

1. 在服務帳戶列表中，點擊剛建立的帳戶（`skillcraft-ims-sync@...`）
2. 點擊 **金鑰** 標籤
3. **新增金鑰** → **建立新的金鑰**
4. 類型選擇 **JSON**
5. 點擊 **建立** — 瀏覽器會自動下載 JSON 檔案

**儲存金鑰到安全位置**：

```bash
mkdir -p ~/.config/skillcraft-ims
mv ~/Downloads/your-project-*.json ~/.config/skillcraft-ims/service-account.json
chmod 600 ~/.config/skillcraft-ims/service-account.json
```

> ⚠️ **安全注意**：請勿將此金鑰檔案提交到 Git 倉庫！
> `.gitignore` 已設定忽略 `*.json` 金鑰檔案。

---

## 步驟 5：建立並設定 Google Sheet

1. 前往 [Google Sheets](https://sheets.google.com)
2. 建立新試算表，命名為：`SkillCraft IMS 同步資料`
3. **複製 Sheet ID**：URL 格式為：
   ```
   https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
   ```
   `{SHEET_ID}` 就是你需要的 ID（一串英數字）

4. **分享給 Service Account**：
   - 點擊右上角 **共用**
   - 在輸入框貼上 Service Account 的 email（格式：`xxx@xxx.iam.gserviceaccount.com`）
   - 角色設定為 **編輯者**
   - 取消勾選「通知已收到邀請的使用者」（service account 不需要通知）
   - 點擊 **共用**

---

## 步驟 6：在 SkillCraft IMS 設定

1. 開啟 SkillCraft IMS
2. 點擊左側選單 **設定**
3. 填入：
   - **Google Sheet ID**：步驟 5 複製的 ID
   - **Service Account Key 路徑**：`~/.config/skillcraft-ims/service-account.json`
4. 點擊 **儲存設定**
5. 點擊 **測試連線** — 應顯示「連線成功！」
6. 點擊 **初始化 Sheet** — 自動建立各分頁與標題列

---

## 驗證設定

```bash
# 確認金鑰檔案格式正確
cat ~/.config/skillcraft-ims/service-account.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('✓ Email:', d['client_email'])
print('✓ Project:', d['project_id'])
print('✓ Type:', d['type'])
"
```

---

## 常見問題

**Q：測試連線出現 PERMISSION_DENIED**
→ 確認 Google Sheet 已分享給 Service Account Email（編輯者權限）

**Q：測試連線出現 invalid_grant**
→ 金鑰可能已過期或已撤銷，重新建立 JSON 金鑰

**Q：找不到試算表**
→ 確認 Sheet ID 正確，並且已分享給 Service Account

**Q：API 配額超限**
→ 降低「自動同步間隔」設定（建議 30 分鐘以上）
