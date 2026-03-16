---
name: ims-ai
description: 當使用者要求 AI 需求預測、智慧補貨建議或接入 Claude API 分析庫存/銷售資料時觸發。
---

## AI 需求預測規範

1. **API Key 設定**：Claude API Key 由使用者在「設定 → 進階」頁面填入，儲存在
   `settings.json`（與其他設定共用同一份）。Key 欄位名稱為 `claudeApiKey: string`。
   Settings 頁面在「進階」區塊新增 API Key 輸入框（`type="password"`），旁邊顯示
   連結至 Anthropic Console 說明文字。

2. **IPC 呼叫架構**：所有 Claude API 呼叫必須在 **main process** 執行，renderer
   不得直接 fetch Anthropic API（避免暴露 Key 在 DevTools）：
   - IPC：`ai:forecast(productIds?: number[])` → main process 組裝 prompt + 呼叫
     `@anthropic-ai/sdk`，回傳結構化預測結果
   - main process 使用 `Anthropic` client，model 預設 `claude-haiku-4-5-20251001`
     （成本低、速度快，適合批次分析）
   - API Key 從 `getSettings().claudeApiKey` 取得；若未設定則 throw Error 提示用戶

3. **Prompt 設計原則**：
   - 給模型提供結構化 JSON 資料（最近 90 天各商品銷售量、目前庫存、補貨點）
   - 要求模型以 **JSON 格式**回應，使用 `response_format` 或 system prompt 強制格式：
     ```json
     {
       "predictions": [
         {
           "product_id": 1,
           "sku": "ELEC-001",
           "name": "商品名稱",
           "current_stock": 10,
           "predicted_demand_30d": 25,
           "suggested_order_qty": 15,
           "confidence": "high|medium|low",
           "reasoning": "簡短說明"
         }
       ],
       "summary": "整體庫存健康度摘要（1–2 句）"
     }
     ```
   - 系統 prompt 告知模型：「你是進銷存系統的庫存分析師，根據銷售歷史預測未來需求」
   - 限制每次最多送出 20 個商品（`LIMIT 20`），避免 token 超限

4. **資料準備（main process）**：呼叫 `ai:forecast` 時，先從 SQLite 查詢：
   ```sql
   SELECT p.id, p.sku, p.name, p.stock_qty, p.reorder_pt,
          COALESCE(SUM(si.quantity), 0) as sold_90d
   FROM products p
   LEFT JOIN sale_items si ON si.product_id = p.id
   LEFT JOIN sales_orders so ON si.sales_order_id = so.id
     AND so.status = 'completed'
     AND so.order_date >= date('now', '-90 days')
   GROUP BY p.id
   ORDER BY sold_90d DESC
   LIMIT 20
   ```
   若指定 `productIds` 則加 `WHERE p.id IN (...)` 條件。

5. **UI 呈現（Dashboard 或 Reports）**：
   - 在 Dashboard 新增「AI 需求預測」卡片（`Brain` icon，紫色邊框）
   - 卡片預設顯示「點擊分析」按鈕，觸發 `useMutation` 呼叫 `ai:forecast`
   - 分析中顯示 loading spinner + 「AI 分析中...」文字
   - 結果以表格呈現：商品名稱、現有庫存、預估 30 天需求、建議採購量、信心度、說明
   - 信心度 Badge：high → 綠色、medium → 黃色、low → 橘色
   - 結果頂部顯示 AI 產出的 `summary` 文字（淺色 italic 字）
   - 底部顯示「一鍵建立採購單」按鈕，勾選需要採購的商品後呼叫 `purchases:create`
   - queryKey 不使用 `useQuery`（非輪詢），改用 `useMutation` + `useState` 存結果
   - AI Key 未設定時，卡片顯示提示訊息與前往設定頁的連結

6. **錯誤處理**：
   - API Key 無效（401）→ toast error「API Key 無效，請至設定頁面更新」
   - 網路錯誤 → toast error「無法連線至 Claude API，請確認網路連線」
   - 回應格式非 JSON → log 原始回應並 toast error「AI 回應格式異常，請重試」
   - 以上錯誤均不 crash app，IPC handler 統一 `try/catch` 並 `return { success: false, error }`

7. **AI 需求預測獨立頁面（/ai）**：
   - **路由**：`/ai`，元件位於 `src/renderer/src/pages/AiInsight.tsx`
   - **側邊欄 nav item**：`{ to: '/ai', icon: Brain, label: t.nav.ai }`，插入在 `reports` 之前；需從 lucide-react import `Brain`
   - **翻譯鍵**（新增至 `translations.ts` 的 `zh` 與 `en` 兩個物件）：
     - `nav.ai`：`'AI 預測'` / `'AI Forecast'`
     - `pageTitles['/ai']`：`'AI 需求預測'` / `'AI Demand Forecast'`
     - `ai.runForecast`：`'開始分析'` / `'Run Forecast'`
     - `ai.analyzing`：`'AI 分析中...'` / `'Analyzing...'`
     - `ai.lastUpdated`：`'上次分析時間'` / `'Last analyzed'`
     - `ai.noApiKey`：`'尚未設定 Claude API Key'` / `'Claude API Key not configured'`
     - `ai.goToSettings`：`'前往設定'` / `'Go to Settings'`
     - `ai.noData`：`'尚無足夠銷售資料進行預測'` / `'Not enough sales data for forecast'`
     - `ai.createPurchaseOrder`：`'一鍵建立採購單'` / `'Create Purchase Order'`
     - `ai.selectAll`：`'全選'` / `'Select All'`
   - **AiInsight.tsx 結構**：
     ```tsx
     // state
     const [result, setResult] = useState<ForecastResult | null>(
       () => JSON.parse(localStorage.getItem('ims-ai-last-result') ?? 'null')
     )
     const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

     // 觸發分析
     const forecastMutation = useMutation({
       mutationFn: () => window.electronAPI.ai.forecast(),
       onSuccess: (data) => {
         setResult(data)
         localStorage.setItem('ims-ai-last-result', JSON.stringify(data))
         localStorage.setItem('ims-ai-last-ts', new Date().toISOString())
       }
     })

     // 上次分析時間（localStorage）
     const lastTs = localStorage.getItem('ims-ai-last-ts')
     ```
   - **四種顯示狀態**（依序判斷）：
     1. `noApiKey`：顯示 `Brain` icon + 說明文字 + 前往設定按鈕（`variant="outline"`）
     2. `isPending`（分析中）：顯示 loading spinner + `ai.analyzing` 文字 + 進度提示「最多約 10 秒」
     3. `result === null`（尚無結果）：顯示「開始分析」按鈕（`variant="default" size="lg"`）+ 說明文字
     4. `result` 有值：顯示結果表格 + 一鍵建立採購單
   - **結果表格欄位**（`DataTable` 元件，`pageSize={20}`）：
     | key | 標題 | 說明 |
     |-----|------|------|
     | `__check__` | Checkbox | 勾選要採購的商品 |
     | `name` | 商品名稱 | 可排序 |
     | `current_stock` | 現有庫存 | 數字，低於 `reorder_pt` 時橙色 |
     | `predicted_demand_30d` | 預估 30 天需求 | 數字 |
     | `suggested_order_qty` | 建議採購量 | 數字，0 時灰色顯示「—」 |
     | `confidence` | 信心度 | Badge：high→綠、medium→黃、low→橙 |
     | `reasoning` | AI 說明 | `text-sm text-muted-foreground`，截斷至 80 字元（`truncate`） |
   - **AI summary 摘要**：表格上方顯示 `result.summary`（`text-sm italic text-muted-foreground bg-muted/40 rounded-lg p-3`）
   - **上次分析時間**：summary 右側顯示 `lastTs`（`text-xs text-muted-foreground`，格式 `YYYY/MM/DD HH:mm`）
   - **一鍵建立採購單**：勾選 1 筆以上時底部浮現操作列（同 Products 批次操作樣式）；
     點擊後組裝 `{ supplier_id: null, order_date: today, items: selectedPredictions.map(p => ({ product_id: p.product_id, quantity: p.suggested_order_qty, unit_price: 0 })) }` 並呼叫 `purchases:create`；成功後 toast + invalidate `['purchases']`
   - **Dashboard `aiInsight` widget** 替換為輕量摘要卡：
     - 不呼叫 `ai:forecast`（避免自動消耗 token）
     - 改從 `localStorage.getItem('ims-ai-last-result')` 讀取快取結果
     - 顯示：上次分析時間 + 建議採購商品數量（`suggested_order_qty > 0` 的筆數）+ 「查看完整分析」連結（`navigate('/ai')`）
     - 無快取時顯示「點擊前往 AI 分析」按鈕，不顯示空 spinner
     - widget 高度固定（不隨結果筆數變化），`CardContent` 以 `flex flex-col gap-2` 排版

8. **分析範圍選擇器（Scope Selector）**：
   - `ai:forecast` IPC 改為接受 `params: { scope: 'smart' | 'low_stock' | 'top_sales' | 'custom', productIds?: number[] }`
   - main process 依 `scope` 動態組裝 SQL：
     - `smart`：`(p.stock_qty <= p.reorder_pt OR (COALESCE(sold_30d,0) / 30.0 > 0 AND p.stock_qty / NULLIF(COALESCE(sold_30d,0)/30.0,0) < 14)) LIMIT 15`
     - `low_stock`：`WHERE p.stock_qty <= p.reorder_pt`（無 LIMIT）
     - `top_sales`：原有邏輯 `HAVING sold_30d > 0 ORDER BY sold_30d DESC LIMIT 10`
     - `custom`：`WHERE p.id IN (?)` + productIds；productIds 為空陣列時 throw `'請至少選擇一項商品'`
   - `global.d.ts` 新增 `AiForecastParams` 型別，`ai.forecast()` 改為 `ai.forecast(params: AiForecastParams)`
   - `preload/index.ts`：`forecast: (params) => ipcRenderer.invoke('ai:forecast', params)`
   - **UI**：`AiInsight.tsx` 頁面頂部（Generate 按鈕左側）加 scope chip bar：
     ```tsx
     // 4 個 chip，active 時 bg-primary/15 text-primary border-primary/30
     // 非 active：bg-muted/40 border-border
     const SCOPES = ['smart', 'low_stock', 'top_sales', 'custom'] as const
     ```
   - 選擇 `custom` 時開啟 `ProductPickerDialog`（`src/renderer/src/components/ai/ProductPickerDialog.tsx`）：
     - 從 `useQuery(['products'])` 讀取商品列表，checkbox 多選，最多 20 筆
     - 確認後關閉 dialog，selectedProductIds 更新
   - 右側顯示灰色小字「將分析 N 項商品」（每次 scope 切換時呼叫 `ai:previewScope(scope, productIds?)` 取得預覽數量，或直接前端計算）；若 `smart` 或 `low_stock` 則呼叫 IPC 取精確數

9. **資料新鮮度偵測（Freshness Detection）**：
   - 新增 IPC handler `ai:checkFreshness()` → `{ hoursSince: number; newSalesCount: number }`
     ```ts
     // main process
     const latest = db.prepare('SELECT generated_at FROM ai_forecasts ORDER BY id DESC LIMIT 1').get()
     if (!latest) return { hoursSince: Infinity, newSalesCount: 0 }
     const hoursSince = (Date.now() - new Date(latest.generated_at).getTime()) / 3600000
     const newSalesCount = db.prepare(
       'SELECT COUNT(*) as cnt FROM sales_orders WHERE created_at > ?'
     ).get(latest.generated_at).cnt
     return { hoursSince, newSalesCount }
     ```
   - `preload/index.ts` 新增：`checkFreshness: () => ipcRenderer.invoke('ai:checkFreshness')`
   - `global.d.ts` 新增：`ai.checkFreshness(): Promise<{ hoursSince: number; newSalesCount: number }>`
   - **UI**：`useQuery(['ai', 'freshness'], ..., { staleTime: 0 })` 在頁面載入時執行；
     若 `hoursSince < 24 && newSalesCount < 5`，在 scope bar 下方顯示 banner：
     ```tsx
     // bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2.5 text-sm
     // 左側 Info icon（text-blue-400），右側兩按鈕
     // [重新分析]（variant="outline" size="sm"）/ [繼續使用上次結果]（variant="ghost" size="sm"）
     ```
   - `dismissFreshness` state（`useState(false)`）：點「繼續使用上次結果」設為 true，banner 隱藏；點「重新分析」直接觸發 mutation + dismiss

10. **信心度 Badge（Confidence）**：
    - `AiForecastResult.items[]` 新增 `confidence: 'high' | 'medium' | 'low'`（`schema.ts`）
    - `ai:forecast` prompt 新增 `confidence` 欄位說明：
      ```
      "confidence": "high"（日均銷量穩定且庫存低於補貨點）/ "medium"（一般情況）/ "low"（近30天銷量<3筆或庫存超過補貨點3倍以上）
      ```
    - 結果表格新增「信心度」欄（`t.ai.colConfidence`），渲染 badge：
      - `high` → `bg-green-500/15 text-green-600 dark:text-green-400`
      - `medium` → `bg-yellow-500/15 text-yellow-600 dark:text-yellow-400`
      - `low` → `bg-orange-500/15 text-orange-600 dark:text-orange-400`
    - 結果表格右上角新增信心度篩選 chips（`全部 / 僅高信心 / 僅低信心`），`confidenceFilter` state 過濾 `forecast.items`；chips 樣式與 scope bar 相同

11. **歷史比較欄（Historical Comparison）**：
    - `ai:forecast` 的清除邏輯改為保留最新 2 筆：
      ```sql
      DELETE FROM ai_forecasts WHERE id NOT IN (SELECT id FROM ai_forecasts ORDER BY id DESC LIMIT 2)
      ```
    - `ai:getLatest` 回傳結構改為 `{ current: AiForecastResult; previous: AiForecastResult | null } | null`：
      ```ts
      const rows = db.prepare('SELECT ... FROM ai_forecasts ORDER BY id DESC LIMIT 2').all()
      if (!rows[0]) return null
      const parse = (r) => ({ summary: r.summary, items: JSON.parse(r.items_json), generatedAt: r.generated_at })
      return { current: parse(rows[0]), previous: rows[1] ? parse(rows[1]) : null }
      ```
    - `schema.ts` 新增 `AiForecastLatest` type：`{ current: AiForecastResult; previous: AiForecastResult | null } | null`
    - `global.d.ts`：`ai.getLatest()` 回傳型別改為 `Promise<AiForecastLatest>`
    - **UI**：結果表格「建議採購量」欄後插入「上次建議」欄（`t.ai.colPrevSuggest`）：
      - 找到相同 `product_id` 的前一筆：`prevItem = previous?.items.find(p => p.product_id === item.product_id)`
      - 有前一筆：顯示數量 + 趨勢符號（`diff > 0` → `text-green-500 ▲+N`；`diff < 0` → `text-red-400 ▼N`；`diff === 0` → `text-muted-foreground =`）
      - 無前一筆（新上榜）：灰色小字「新上榜」（`t.ai.newEntry`）
      - 若 `previous === null`：整欄不渲染（`hasPrevious` 判斷）

12. **批次建立採購單（Batch Purchase）**：
    - 移除結果表格各行的個別「建立採購單」按鈕
    - 結果表格最左側新增 Checkbox 欄；只有 `suggested_reorder_qty > 0` 的列才可勾選（其餘 disabled）
    - 表頭 Checkbox「全選有建議商品」：`selectAll` → 勾選所有 `suggested_reorder_qty > 0` 的列
    - `selectedProductIds: Set<number>` state（product_id）
    - 勾選 ≥ 1 筆時底部浮現操作列（`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-3`）：
      - 「已選 N 項商品」+ `建立採購單`（`ShoppingCart` icon）+ `取消選取`
    - 點擊「建立採購單」→ `navigate('/purchases', { state: { openForm: true, items: selectedItems.map(i => ({ product_id: i.product_id, quantity: i.suggested_reorder_qty, unit_price: 0 })) } })`
    - Purchases 頁面的 `useEffect` 讀取 `location.state?.items`，帶入 `PurchaseForm` 的 `initialData.items`

13. **Dashboard Widget 摘要升級**：
    - `Dashboard.tsx` 的 `aiInsight` widget 改為從 `localStorage['ims-ai-last-result']` 讀取快取（不呼叫任何 IPC）：
      ```tsx
      const cached = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('ims-ai-last-result') ?? 'null') as AiForecastResult | null }
        catch { return null }
      }, [])
      const needReorder = cached?.items.filter(i => i.suggested_reorder_qty > 0) ?? []
      ```
    - **有快取**：顯示上次分析時間（相對格式：「N 小時前」/ 「N 天前」）、需補貨商品數量（`⚠ N 項需補貨`）、前 3 名建議補貨商品列表（name + 數量 + confidence badge）、右上角「前往完整分析 →」連結
    - **無快取**：保留現有「前往 AI 需求預測」按鈕
    - **Sidebar badge**：`Sidebar.tsx` 從 `localStorage['ims-ai-last-result']` 讀取，計算 `needReorder.length`；`> 0` 時在 `/ai` nav item 右側顯示橙色 badge（`bg-orange-500/20 text-orange-600`）；Sidebar 以 `useState` + `useEffect` 讀取（每次 mount 讀一次即可，不需輪詢）

14. **套用建議補貨點（Apply Suggested Reorder Points）**：
    - 顯示條件：`result !== null` 且至少 1 筆 `predicted_demand_30d > 0`
    - 按鈕位置：summary 摘要區塊右側，`Target` icon，`variant="outline" size="sm"`
    - 點擊後先顯示 `AlertDialog` 確認：標題「套用建議補貨點」，描述「將根據 AI 預測更新 N 項商品的補貨點（預測需求量的 50%），確認繼續？」
    - 確認後：遍歷 `result.predictions`，篩出 `predicted_demand_30d > 0` 的項目，計算 `reorder_pt = Math.ceil(predicted_demand_30d * 0.5)`
    - 呼叫 `products:batchUpdate(ids: number[], data: { reorder_pt: number })` — 但因各商品 reorder_pt 不同，需逐筆呼叫 `products:update(id, { reorder_pt })` 或新增 `products:batchUpdateReorderPt(updates: { id: number; reorder_pt: number }[])` IPC
    - 建議使用 `products:batchUpdateReorderPt(updates)` 以單一 transaction 批次更新：`UPDATE products SET reorder_pt=?, updated_at=datetime('now') WHERE id=?` 逐筆執行於 transaction 內
    - 成功後 `queryClient.invalidateQueries({ queryKey: ['products'] })`，toast success：「已更新 N 項商品補貨點」
    - 失敗時 toast error；`useMutation` 管理 `isPending` 狀態（按鈕顯示 loading spinner）
    - i18n keys：`ai.applyReorderPts`（「套用建議補貨點」）、`ai.confirmApplyReorderPtsTitle`（確認標題）、`ai.confirmApplyReorderPtsDesc`（確認說明）
