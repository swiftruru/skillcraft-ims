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

6. **Command Palette 動作模式（Action Mode）**：
   - 當輸入框為空時，預設顯示靜態「動作指令」清單（不呼叫 IPC）
   - 動作指令以 `CommandAction` 介面定義：
     `{ id, label, icon, shortcut?, handler }`
   - 清單分兩段：搜尋結果在上（有輸入時），動作指令在下
     （分隔線 + 小標題「動作」/「Actions」）
   - 動作指令使用 `Zap` icon，背景用 `bg-primary/5`
   - 支援 `↑↓` 鍵跨越搜尋結果與動作兩段導覽

7. **預設動作清單**：內建以下動作指令，純前端觸發無需 IPC：

   | id | zh | en | handler |
   | --- | --- | --- | --- |
   | `new-purchase` | 新增採購單 | New Purchase Order | navigate + openForm |
   | `new-sale` | 新增銷售單 | New Sale Order | navigate + openForm |
   | `new-product` | 新增商品 | New Product | navigate + openForm |
   | `new-stocktake` | 開始盤點 | Start Stock Take | navigate + openForm |
   | `toggle-theme` | 切換主題 | Toggle Theme | toggleTheme() |
   | `toggle-lang` | 切換語言 | Toggle Language | toggleLang() |

   navigate 動作一律帶 `{ state: { openForm: true } }`。

8. **動作篩選**：輸入不以 `>` 開頭時，同時顯示搜尋結果與
   符合文字的動作指令；輸入以 `>` 開頭時，隱藏搜尋結果，
   只顯示符合 `>` 後文字的動作指令。

9. **最近瀏覽（Recently Viewed）**：
   - localStorage key：`ims-recent-items`，max 5 筆
   - 每筆格式：`SearchResult`（`{ type, id, title, meta? }`）
   - 觸發時機：使用者在 CommandPalette 點擊任一搜尋結果時，
     呼叫 `addRecentItem(result)` 寫入（去重 by type+id，新的排前面）
   - 顯示位置：query 為空時，出現在 Actions 段落上方，
     標題「最近瀏覽」/「Recently Viewed」（Clock icon）
   - 工具函式放在 `src/renderer/src/lib/recentItems.ts`：
     - `getRecentItems(): SearchResult[]`
     - `addRecentItem(item: SearchResult): void`
   - 最近瀏覽的點擊行為與搜尋結果相同（navigate + 記錄）
