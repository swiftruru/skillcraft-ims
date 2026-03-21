import { ipcMain } from 'electron'
import Anthropic from '@anthropic-ai/sdk'
import { getDb } from '../db'

type ForecastScope = 'smart' | 'low_stock' | 'top_sales' | 'custom'

interface ForecastParams {
  scope?: ForecastScope
  productIds?: number[]
}

export function registerAiIpc(): void {
  ipcMain.handle('ai:forecast', async (_e, params: ForecastParams = {}) => {
    const db = getDb()
    const { scope = 'top_sales', productIds = [] } = params

    // Get API key from settings
    const apiKeyRow = db
      .prepare(`SELECT value FROM app_settings WHERE key = 'claudeApiKey'`)
      .get() as { value: string } | undefined
    const apiKey = apiKeyRow?.value?.trim()
    if (!apiKey) {
      throw new Error('未設定 Claude API Key，請至設定頁面填入。')
    }

    if (scope === 'custom' && productIds.length === 0) {
      throw new Error('請至少選擇一項商品')
    }

    // Build SQL based on scope
    let salesData: {
      product_id: number
      sku: string
      name: string
      category: string
      stock_qty: number
      reorder_pt: number
      sold_30d: number
      avg_daily: number
    }[]

    const baseSelect = `
      SELECT p.id as product_id, p.sku, p.name, p.category,
             p.stock_qty, p.reorder_pt,
             COALESCE(SUM(si.quantity), 0) as sold_30d,
             ROUND(COALESCE(SUM(si.quantity), 0) / 30.0, 2) as avg_daily
      FROM products p
      LEFT JOIN sale_items si ON si.product_id = p.id
      LEFT JOIN sales_orders so ON si.sales_order_id = so.id
        AND so.status = 'completed'
        AND so.order_date >= date('now', '-30 days')
    `

    if (scope === 'smart') {
      salesData = db
        .prepare(
          `${baseSelect}
           GROUP BY p.id
           HAVING p.stock_qty <= p.reorder_pt
              OR (COALESCE(SUM(si.quantity), 0) > 0
                  AND CAST(p.stock_qty AS REAL) / (COALESCE(SUM(si.quantity), 0) / 30.0) < 14)
           ORDER BY (p.stock_qty <= p.reorder_pt) DESC, sold_30d DESC
           LIMIT 15`
        )
        .all() as typeof salesData
    } else if (scope === 'low_stock') {
      salesData = db
        .prepare(
          `${baseSelect}
           WHERE p.stock_qty <= p.reorder_pt
           GROUP BY p.id
           ORDER BY p.stock_qty ASC`
        )
        .all() as typeof salesData
    } else if (scope === 'custom') {
      const placeholders = productIds.map(() => '?').join(',')
      salesData = db
        .prepare(
          `${baseSelect}
           WHERE p.id IN (${placeholders})
           GROUP BY p.id
           ORDER BY sold_30d DESC`
        )
        .all(...productIds) as typeof salesData
    } else {
      // top_sales (default)
      salesData = db
        .prepare(
          `${baseSelect}
           GROUP BY p.id
           HAVING sold_30d > 0
           ORDER BY sold_30d DESC
           LIMIT 10`
        )
        .all() as typeof salesData
    }

    if (salesData.length === 0) {
      throw new Error('近 30 天無銷售資料，無法進行預測。')
    }

    const prompt = `你是一個進銷存管理系統的 AI 顧問。請根據以下商品的近 30 天銷售資料和目前庫存，分析需求趨勢並提供補貨建議。

## 商品資料（近 30 天）
${salesData
  .map(
    (p) =>
      `- ${p.name}（${p.sku}）：庫存 ${p.stock_qty}，補貨點 ${p.reorder_pt}，日均銷量 ${p.avg_daily}，30天銷量 ${p.sold_30d}`
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
      "confidence": "<high|medium|low>（high：日均銷量穩定且庫存低於補貨點；low：近30天銷量<3筆或庫存超補貨點3倍以上；medium：其他情況）",
      "reasoning": "<string（該商品的補貨建議原因，繁體中文，1句話）>"
    }
  ]
}

只回傳 JSON，不要有任何其他說明文字。`

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) throw new Error('AI 回應格式錯誤，請重試。')
    const jsonStr = text.slice(start, end + 1)
    const parsed = JSON.parse(jsonStr)
    const result = { ...parsed, generatedAt: new Date().toISOString() }

    // Persist to DB — keep only the latest 2 rows
    db.prepare(
      'INSERT INTO ai_forecasts (summary, items_json, generated_at) VALUES (?, ?, ?)'
    ).run(result.summary, JSON.stringify(result.items), result.generatedAt)
    db.prepare(
      'DELETE FROM ai_forecasts WHERE id NOT IN (SELECT id FROM ai_forecasts ORDER BY id DESC LIMIT 2)'
    ).run()

    return result
  })

  ipcMain.handle('ai:getLatest', () => {
    const db = getDb()
    const rows = db
      .prepare('SELECT summary, items_json, generated_at FROM ai_forecasts ORDER BY id DESC LIMIT 2')
      .all() as { summary: string; items_json: string; generated_at: string }[]
    if (!rows[0]) return null
    const parse = (r: { summary: string; items_json: string; generated_at: string }) => ({
      summary: r.summary,
      items: JSON.parse(r.items_json),
      generatedAt: r.generated_at
    })
    return {
      current: parse(rows[0]),
      previous: rows[1] ? parse(rows[1]) : null
    }
  })

  ipcMain.handle('ai:checkFreshness', () => {
    const db = getDb()
    const latest = db
      .prepare('SELECT generated_at FROM ai_forecasts ORDER BY id DESC LIMIT 1')
      .get() as { generated_at: string } | undefined
    if (!latest) return { hoursSince: Infinity, newSalesCount: 0 }
    const hoursSince = (Date.now() - new Date(latest.generated_at).getTime()) / 3600000
    const row = db
      .prepare(`SELECT COUNT(*) as cnt FROM sales_orders WHERE created_at > ?`)
      .get(latest.generated_at) as { cnt: number }
    return { hoursSince, newSalesCount: row.cnt }
  })

  // ── RAG Chat ─────────────────────────────────────────────────────────────
  ipcMain.handle('ai:chat', async (_e, question: string) => {
    const db = getDb()
    const apiKeyRow = db
      .prepare(`SELECT value FROM app_settings WHERE key = 'claudeApiKey'`)
      .get() as { value: string } | undefined
    const apiKey = apiKeyRow?.value?.trim()
    if (!apiKey) throw new Error('未設定 Claude API Key，請至設定頁面填入。')

    // ── Step 1: Retrieval — query SQLite for business context ──────────────
    const totalProducts = (
      db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number }
    ).cnt

    const lowStockItems = db
      .prepare(
        `SELECT name, stock_qty, reorder_pt FROM products
         WHERE stock_qty <= reorder_pt ORDER BY stock_qty ASC LIMIT 10`
      )
      .all() as { name: string; stock_qty: number; reorder_pt: number }[]

    const salesStats = db
      .prepare(
        `SELECT COUNT(*) as order_count,
                ROUND(COALESCE(SUM(total_amount), 0), 0) as total_amount
         FROM sales_orders
         WHERE status = 'completed' AND order_date >= date('now', '-30 days')`
      )
      .get() as { order_count: number; total_amount: number }

    const topProducts = db
      .prepare(
        `SELECT p.name, SUM(si.quantity) as qty,
                ROUND(SUM(si.quantity * si.unit_price), 0) as amount
         FROM sale_items si
         JOIN products p ON si.product_id = p.id
         JOIN sales_orders so ON si.sales_order_id = so.id
         WHERE so.status = 'completed' AND so.order_date >= date('now', '-30 days')
         GROUP BY p.id ORDER BY qty DESC LIMIT 5`
      )
      .all() as { name: string; qty: number; amount: number }[]

    const pendingPurchases = db
      .prepare(
        `SELECT COUNT(*) as cnt, ROUND(COALESCE(SUM(total_amount), 0), 0) as total
         FROM purchase_orders WHERE status IN ('pending', 'ordered')`
      )
      .get() as { cnt: number; total: number }

    const pendingSales = db
      .prepare(
        `SELECT COUNT(*) as cnt, ROUND(COALESCE(SUM(total_amount), 0), 0) as total
         FROM sales_orders WHERE status IN ('pending', 'confirmed')`
      )
      .get() as { cnt: number; total: number }

    const customerCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM customers').get() as { cnt: number }
    ).cnt

    const supplierCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM suppliers').get() as { cnt: number }
    ).cnt

    const unpaidSales = (
      db
        .prepare(
          `SELECT ROUND(COALESCE(SUM(total_amount), 0), 0) as total
           FROM sales_orders WHERE payment_status = 'unpaid' AND status = 'completed'`
        )
        .get() as { total: number }
    ).total

    const unpaidPurchases = (
      db
        .prepare(
          `SELECT ROUND(COALESCE(SUM(total_amount), 0), 0) as total
           FROM purchase_orders WHERE payment_status = 'unpaid' AND status = 'completed'`
        )
        .get() as { total: number }
    ).total

    // ── Step 2: Augment — build context string ─────────────────────────────
    const context = [
      `【庫存概況】`,
      `- 總商品數：${totalProducts} 項`,
      `- 低庫存商品（庫存 ≤ 補貨點）：${lowStockItems.length} 項`,
      ...lowStockItems.map(
        (p) => `  · ${p.name}：庫存 ${p.stock_qty}，補貨點 ${p.reorder_pt}`
      ),
      ``,
      `【近 30 天銷售】`,
      `- 完成訂單數：${salesStats.order_count} 筆`,
      `- 銷售總額：NT$${salesStats.total_amount.toLocaleString()}`,
      `- 銷量前 5 名商品：`,
      ...(topProducts.length > 0
        ? topProducts.map(
            (p, i) => `  ${i + 1}. ${p.name}：售出 ${p.qty} 件，金額 NT$${p.amount.toLocaleString()}`
          )
        : ['  （近 30 天無銷售資料）']),
      ``,
      `【待處理事項】`,
      `- 待處理採購單：${pendingPurchases.cnt} 筆，金額 NT$${pendingPurchases.total.toLocaleString()}`,
      `- 待處理銷售單：${pendingSales.cnt} 筆，金額 NT$${pendingSales.total.toLocaleString()}`,
      ``,
      `【客戶與供應商】`,
      `- 客戶數：${customerCount} 位，供應商數：${supplierCount} 家`,
      `- 應收未付（已完成銷售訂單）：NT$${unpaidSales.toLocaleString()}`,
      `- 應付未付（已完成採購訂單）：NT$${unpaidPurchases.toLocaleString()}`
    ].join('\n')

    // ── Step 3: Generation — call Claude API ───────────────────────────────
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        '你是 SkillCraft IMS 進銷存系統的 AI 助手。' +
        '請嚴格根據【業務資料】回答使用者的問題。' +
        '如果資料不足以回答，請說明限制，不要捏造數字。' +
        '回答請使用繁體中文，條列式整理，簡潔有重點。',
      messages: [
        {
          role: 'user',
          content: `【業務資料】\n${context}\n\n【問題】\n${question}`
        }
      ]
    })

    const answer = message.content[0].type === 'text' ? message.content[0].text : ''
    return { answer, context }
  })

  ipcMain.handle('ai:previewScope', (_e, params: ForecastParams = {}) => {
    const db = getDb()
    const { scope = 'top_sales', productIds = [] } = params

    if (scope === 'custom') {
      return { count: productIds.length }
    }
    if (scope === 'smart') {
      const row = db
        .prepare(
          `SELECT COUNT(*) as cnt FROM (
            SELECT p.id
            FROM products p
            LEFT JOIN sale_items si ON si.product_id = p.id
            LEFT JOIN sales_orders so ON si.sales_order_id = so.id
              AND so.status = 'completed'
              AND so.order_date >= date('now', '-30 days')
            GROUP BY p.id
            HAVING p.stock_qty <= p.reorder_pt
               OR (COALESCE(SUM(si.quantity), 0) > 0
                   AND CAST(p.stock_qty AS REAL) / (COALESCE(SUM(si.quantity), 0) / 30.0) < 14)
            LIMIT 15
          )`
        )
        .get() as { cnt: number }
      return { count: row.cnt }
    }
    if (scope === 'low_stock') {
      const row = db
        .prepare(`SELECT COUNT(*) as cnt FROM products WHERE stock_qty <= reorder_pt`)
        .get() as { cnt: number }
      return { count: row.cnt }
    }
    // top_sales
    const row = db
      .prepare(
        `SELECT COUNT(*) as cnt FROM (
          SELECT p.id
          FROM products p
          LEFT JOIN sale_items si ON si.product_id = p.id
          LEFT JOIN sales_orders so ON si.sales_order_id = so.id
            AND so.status = 'completed'
            AND so.order_date >= date('now', '-30 days')
          GROUP BY p.id
          HAVING COALESCE(SUM(si.quantity), 0) > 0
          ORDER BY COALESCE(SUM(si.quantity), 0) DESC
          LIMIT 10
        )`
      )
      .get() as { cnt: number }
    return { count: row.cnt }
  })
}
