import { ipcMain } from 'electron'
import Anthropic from '@anthropic-ai/sdk'
import { getDb } from '../db'

export function registerAiIpc(): void {
  ipcMain.handle('ai:forecast', async () => {
    const db = getDb()

    // Get API key from settings
    const apiKeyRow = db
      .prepare(`SELECT value FROM app_settings WHERE key = 'claudeApiKey'`)
      .get() as { value: string } | undefined
    const apiKey = apiKeyRow?.value?.trim()
    if (!apiKey) {
      throw new Error('未設定 Claude API Key，請至設定頁面填入。')
    }

    // Prepare data: top 20 products by sales volume in last 30 days, with stock info
    const salesData = db
      .prepare(
        `SELECT p.id as product_id, p.sku, p.name, p.category,
                p.stock_qty, p.reorder_pt,
                COALESCE(SUM(si.quantity), 0) as sold_30d,
                ROUND(COALESCE(SUM(si.quantity), 0) / 30.0, 2) as avg_daily
         FROM products p
         LEFT JOIN sale_items si ON si.product_id = p.id
         LEFT JOIN sales_orders so ON si.sales_order_id = so.id
           AND so.status = 'completed'
           AND so.order_date >= date('now', '-30 days')
         GROUP BY p.id
         HAVING sold_30d > 0
         ORDER BY sold_30d DESC
         LIMIT 20`
      )
      .all() as {
        product_id: number
        sku: string
        name: string
        category: string
        stock_qty: number
        reorder_pt: number
        sold_30d: number
        avg_daily: number
      }[]

    if (salesData.length === 0) {
      throw new Error('近 30 天無銷售資料，無法進行預測。')
    }

    const prompt = `你是一個進銷存管理系統的 AI 顧問。請根據以下商品的近 30 天銷售資料和目前庫存，分析需求趨勢並提供補貨建議。

## 商品資料（近 30 天）
${salesData
  .map(
    (p) =>
      `- ${p.name}（${p.sku}）：庫存 ${p.stock_qty}，日均銷量 ${p.avg_daily}，30天銷量 ${p.sold_30d}，補貨點 ${p.reorder_pt}`
  )
  .join('\n')}

請以 JSON 格式回覆，結構如下：
{
  "summary": "整體分析摘要（繁體中文，2-3句話）",
  "items": [
    {
      "product_id": <number>,
      "sku": "<string>",
      "name": "<string>",
      "category": "<string>",
      "avg_daily_sales": <number>,
      "stock_qty": <number>,
      "days_remaining": <number|null（庫存用完天數，null表示無銷量）>,
      "suggested_reorder_qty": <number（建議補貨量，0表示暫不需要）>,
      "reasoning": "<string（該商品的補貨建議原因，繁體中文，1句話）>"
    }
  ]
}

只回傳 JSON，不要有任何其他說明文字。`

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 回應格式錯誤，請重試。')

    const parsed = JSON.parse(jsonMatch[0])
    return { ...parsed, generatedAt: new Date().toISOString() }
  })
}
