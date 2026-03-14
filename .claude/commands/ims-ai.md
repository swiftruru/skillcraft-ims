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
