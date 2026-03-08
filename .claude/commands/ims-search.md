---
name: ims-search
description: 當使用者要求新增或修改全域搜尋、Command Palette、跨資料表查詢或快捷鍵搜尋功能時觸發。
---

## 全域搜尋開發規範

1. **搜尋 IPC 結構**：全域搜尋統一走 `search:global` 單一 IPC channel，在 main process 以 SQLite `LIKE` 同時查詢 products、suppliers、customers、purchase_orders、sales_orders，不為個別資料表開獨立搜尋 channel：

   ```typescript
   ipcMain.handle('search:global', (_e, query: string) => { ... })
   ```

   每種資料表最多回傳 5 筆，整合成統一 `SearchResult[]` 陣列回傳。

2. **SearchResult 格式**：所有搜尋結果必須符合以下介面，type 用於決定跳轉路由與顯示 icon：

   ```typescript
   interface SearchResult {
     type: 'product' | 'supplier' | 'customer' | 'purchase' | 'sale'
     id: number
     title: string      // 主要顯示文字（商品名稱、訂單編號等）
     subtitle: string   // 類別標籤
     meta?: string      // 補充資訊（庫存量、狀態等）
   }
   ```

3. **CommandPalette 互動規範**：
   - 以 `Cmd+K`（macOS）/ `Ctrl+K`（Windows/Linux）開啟，在 `Layout.tsx` 的 `useEffect` 中統一監聽 `keydown`，不在個別頁面分散綁定
   - Header 提供搜尋按鈕作為滑鼠觸發入口，顯示快捷鍵提示 `⌘K`
   - 輸入後 debounce 200ms 再呼叫 IPC，避免每次按鍵都觸發查詢
   - 鍵盤導航：`↑↓` 移動選取、`Enter` 跳轉、`Esc` 關閉

4. **跳轉行為**：選取結果後使用 `react-router-dom` 的 `useNavigate` 跳轉至對應列表頁（`/products`、`/suppliers` 等），不直接開啟 detail panel，保持導航一致性。

5. **空字串保護**：`search:global` IPC handler 在 `query.trim().length < 1` 時直接回傳 `[]`，不執行 SQL 查詢，防止 `LIKE '%%'` 掃全表。
