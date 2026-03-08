---
name: ims-export
description: 當使用者要求匯出資料為 CSV 檔案、下載報表或將商品/訂單清單存成檔案時觸發。
---

## CSV 匯出開發規範

1. **IPC channel 命名**：匯出功能統一使用 `export:<type>` 格式，type 可為 `products`、`purchases`、`sales`、`adjustments`，不為每個資料表建立個別格式的匯出。

2. **存檔流程**：匯出必須經由 Electron `dialog.showSaveDialog()` 讓使用者選擇儲存位置，不自行決定路徑；存檔使用 Node.js `fs.writeFileSync`：

   ```typescript
   const { filePath } = await dialog.showSaveDialog({
     defaultPath: `skillcraft-${type}-${date}.csv`,
     filters: [{ name: 'CSV', extensions: ['csv'] }]
   })
   if (!filePath) return { success: false }
   fs.writeFileSync(filePath, csvContent, 'utf-8')
   ```

3. **CSV 格式規範**：
   - 第一列為欄位標頭（中文），以逗號分隔
   - 字串值若含逗號或換行，以雙引號包裹並逸出內部雙引號（`"` → `""`）
   - 日期格式統一為 `YYYY-MM-DD HH:mm`
   - 數字不加千分位符號，保留原始數值方便試算表處理
   - 檔案開頭加 UTF-8 BOM（`\uFEFF`）確保 Excel 正確開啟中文

4. **IPC 回傳格式**：匯出 IPC 統一回傳 `{ success: boolean; filePath?: string; error?: string }`，renderer 依此顯示成功/失敗 toast。

5. **UI 觸發點**：匯出按鈕放在對應頁面的工具列右側，使用 `Download` icon（lucide-react），顯示文字「匯出 CSV」，按下後呈現 loading 狀態直到 IPC 回傳。

6. **不在 renderer 組合 CSV**：CSV 內容組合邏輯全部在 main process 完成，renderer 只負責觸發 IPC 和顯示結果，不處理資料轉換。
