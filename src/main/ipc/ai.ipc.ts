import { ipcMain } from 'electron'
import Anthropic from '@anthropic-ai/sdk'
import { getDb } from '../db'

const MODEL_HAIKU = 'claude-haiku-4-5-20251001'
const MODEL_SONNET = 'claude-sonnet-4-6'

type ForecastScope = 'smart' | 'low_stock' | 'top_sales' | 'custom'

interface ForecastParams {
  scope?: ForecastScope
  productIds?: number[]
}

function classifyTopics(question: string): {
  inventory: boolean; sales: boolean; customers: boolean; suppliers: boolean
} {
  const inv = /庫存|商品|補貨|低庫存|存貨|缺貨/.test(question)
  const sal = /銷售|業績|賣出|銷量|銷售訂單|完成訂單|收入|營業額/.test(question)
  const cus = /客戶|應收|收款|欠款/.test(question)
  const sup = /供應商|採購|進貨|應付|採購單/.test(question)
  const none = !inv && !sal && !cus && !sup
  return { inventory: inv || none, sales: sal || none, customers: cus || none, suppliers: sup || none }
}

// ── Model complexity routing (regex, no API call) ───────────────────────────
function classifyComplexity(question: string): 'haiku' | 'sonnet' {
  const complexPatterns = [
    /分析|趨勢|比較|預測|建議|原因|為什麼|影響/,
    /如果|假設|當.{1,10}時/,
    /怎麼做|如何改善|策略|優化|最佳/
  ]
  if (complexPatterns.some((p) => p.test(question))) return 'sonnet'
  const topics = classifyTopics(question)
  const hitCount = Object.values(topics).filter(Boolean).length
  if (hitCount >= 3) return 'sonnet'
  return 'haiku'
}

// ── Entity Extraction (regex stopword removal + SQLite LIKE, no API call) ───
function extractEntityCandidates(question: string): string[] {
  const stopwords =
    /庫存|銷售|採購|業績|供應商|客戶|商品|產品|訂單|帳款|應收|應付|補貨|低庫存|待處理|未付款|付款|有哪些|哪個|哪些|目前|本月|上月|今年|去年|近期|最近|最多|最少|多少|幾個|幾筆|所有|全部|分析|趨勢|比較|預測|建議|原因|為什麼|影響|怎麼做|如何|策略|優化|最佳|情況|狀況|狀態|資料|資訊|統計|報告/g
  const cleaned = question
    .replace(stopwords, ' ')
    .replace(/[？?。，,！!、\s]+/g, ' ')
    .trim()
  return cleaned.split(' ').filter((t) => t.length >= 2)
}

interface ResolvedEntities {
  products: { id: number; name: string }[]
  customers: { id: number; name: string }[]
  suppliers: { id: number; name: string }[]
}

function resolveEntities(
  db: ReturnType<typeof getDb>,
  candidates: string[]
): ResolvedEntities {
  if (candidates.length === 0) return { products: [], customers: [], suppliers: [] }
  const products: { id: number; name: string }[] = []
  const customers: { id: number; name: string }[] = []
  const suppliers: { id: number; name: string }[] = []
  for (const token of candidates) {
    const like = `%${token}%`
    const ps = db
      .prepare('SELECT id, name FROM products WHERE name LIKE ? LIMIT 3')
      .all(like) as { id: number; name: string }[]
    const cs = db
      .prepare('SELECT id, name FROM customers WHERE name LIKE ? LIMIT 3')
      .all(like) as { id: number; name: string }[]
    const ss = db
      .prepare('SELECT id, name FROM suppliers WHERE name LIKE ? LIMIT 3')
      .all(like) as { id: number; name: string }[]
    ps.forEach((r) => { if (!products.find((x) => x.id === r.id)) products.push(r) })
    cs.forEach((r) => { if (!customers.find((x) => x.id === r.id)) customers.push(r) })
    ss.forEach((r) => { if (!suppliers.find((x) => x.id === r.id)) suppliers.push(r) })
  }
  return { products, customers, suppliers }
}

// ── Pre-Retrieval: time range detection (regex, no API call) ────────────────
interface TimeRange { label: string; sqlFrom: string; sqlTo?: string }

function detectTimeRange(question: string): TimeRange {
  if (/上週|上周|上個禮拜/.test(question))
    return { label: '近 7 天', sqlFrom: "date('now', '-7 days')" }
  if (/本月|這個月/.test(question))
    return { label: '本月', sqlFrom: "date('now', 'start of month')" }
  if (/上個月|上月/.test(question))
    return { label: '上個月', sqlFrom: "date('now', 'start of month', '-1 month')", sqlTo: "date('now', 'start of month', '-1 day')" }
  if (/今年|本年度/.test(question))
    return { label: '今年', sqlFrom: "date('now', 'start of year')" }
  if (/去年/.test(question))
    return { label: '去年', sqlFrom: "date('now', 'start of year', '-1 year')", sqlTo: "date('now', 'start of year', '-1 day')" }
  const daysMatch = question.match(/近\s*(\d+)\s*天/)
  if (daysMatch) { const n = parseInt(daysMatch[1]); return { label: `近 ${n} 天`, sqlFrom: `date('now', '-${n} days')` } }
  const weekMatch = question.match(/近\s*(\d+)\s*週/)
  if (weekMatch) { const n = parseInt(weekMatch[1]); return { label: `近 ${n} 週`, sqlFrom: `date('now', '-${n * 7} days')` } }
  return { label: '近 30 天', sqlFrom: "date('now', '-30 days')" }
}

// ── Guard Layer + Query Rewriting (combined, one API call) ─────────────────
async function preProcessQuestion(
  client: Anthropic,
  question: string
): Promise<{ inScope: boolean; rewritten: string }> {
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system:
        '你是進銷存系統的查詢前處理助手。判斷問題是否在業務範疇內（庫存、銷售、採購、客戶、供應商、財務應收應付），並將業務問題改寫成清晰的標準查詢。\n' +
        '只輸出 JSON，格式：{"inScope": true或false, "rewritten": "改寫後的問題或原問題"}\n' +
        'inScope 為 false 的例子：寫程式、閒聊、學術問題、與進銷存完全無關的請求。',
      messages: [{ role: 'user', content: question }]
    })
    const text = res.content[0].type === 'text' ? res.content[0].text : ''
    const match = text.match(/\{[\s\S]*?\}/)
    const parsed = match ? JSON.parse(match[0]) : {}
    return {
      inScope: parsed.inScope !== false,
      rewritten: typeof parsed.rewritten === 'string' ? parsed.rewritten.trim() : question
    }
  } catch { return { inScope: true, rewritten: question } }
}

// ── Context Window Management: summarize old history ───────────────────────
async function buildHistoryWithSummary(
  client: Anthropic,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<{ history: { role: 'user' | 'assistant'; content: string }[]; summaryNote: string }> {
  const KEEP_RECENT = 8
  if (messages.length <= KEEP_RECENT) return { history: messages, summaryNote: '' }
  try {
    const older = messages.slice(0, -KEEP_RECENT)
    const transcript = older
      .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content.slice(0, 300)}`)
      .join('\n')
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: `摘要以下對話的關鍵結論（2-3 句，保留重要數字）：\n${transcript}` }]
    })
    const summary = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
    return {
      history: messages.slice(-KEEP_RECENT),
      summaryNote: `\n\n【對話歷史摘要（已壓縮 ${older.length} 則舊訊息）】\n${summary}`
    }
  } catch {
    return { history: messages.slice(-KEEP_RECENT), summaryNote: '\n\n（舊對話已自動截斷以控制 token 用量）' }
  }
}

// ── RAG Evaluation: faithfulness scoring ───────────────────────────────────
async function evaluateFaithfulness(
  client: Anthropic,
  context: string,
  answer: string
): Promise<{ score: number; note: string }> {
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: '評估 AI 回答是否忠實於業務資料，不包含捏造數字。只輸出 JSON：{"score": 0-100, "note": "一句中文說明"}',
      messages: [{
        role: 'user',
        content: `【業務資料】\n${context.slice(0, 700)}\n\n【AI 回答】\n${answer.slice(0, 500)}`
      }]
    })
    const text = res.content[0].type === 'text' ? res.content[0].text : ''
    const match = text.match(/\{[\s\S]*?\}/)
    const parsed = match ? JSON.parse(match[0]) : {}
    return {
      score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 0,
      note: typeof parsed.note === 'string' ? parsed.note : ''
    }
  } catch { return { score: 0, note: '評估失敗' } }
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

  // ── Chat Session Management ───────────────────────────────────────────────
  ipcMain.handle('ai:getSessions', () => {
    const db = getDb()
    return db
      .prepare(
        `SELECT s.id, s.title, s.created_at, s.updated_at,
                (SELECT content FROM ai_chat_messages WHERE session_id = s.id AND role = 'user' ORDER BY id ASC LIMIT 1) as preview
         FROM ai_chat_sessions s
         ORDER BY s.updated_at DESC`
      )
      .all()
  })

  ipcMain.handle('ai:getSessionMessages', (_e, sessionId: number) => {
    const db = getDb()
    return db
      .prepare(
        `SELECT id, role, content, context, created_at
         FROM ai_chat_messages WHERE session_id = ? ORDER BY id ASC`
      )
      .all(sessionId)
  })

  ipcMain.handle('ai:createSession', () => {
    const db = getDb()
    const result = db
      .prepare(`INSERT INTO ai_chat_sessions (title) VALUES ('新對話')`)
      .run()
    return { id: result.lastInsertRowid as number }
  })

  ipcMain.handle('ai:deleteSession', (_e, sessionId: number) => {
    const db = getDb()
    db.prepare(`DELETE FROM ai_chat_sessions WHERE id = ?`).run(sessionId)
    return { success: true }
  })

  // ── RAG Chat ─────────────────────────────────────────────────────────────
  ipcMain.handle('ai:chat', async (_e, question: string, sessionId?: number) => {
    const db = getDb()
    const apiKeyRow = db
      .prepare(`SELECT value FROM app_settings WHERE key = 'claudeApiKey'`)
      .get() as { value: string } | undefined
    const apiKey = apiKeyRow?.value?.trim()
    if (!apiKey) throw new Error('未設定 Claude API Key，請至設定頁面填入。')

    const client = new Anthropic({ apiKey })

    // ── Step 1: Pre-Retrieval ─────────────────────────────────────────────
    // 1a. Detect time range from original question (regex, no extra API call)
    const timeRange = detectTimeRange(question)
    const dateCondition = timeRange.sqlTo
      ? `AND order_date >= ${timeRange.sqlFrom} AND order_date <= ${timeRange.sqlTo}`
      : `AND order_date >= ${timeRange.sqlFrom}`

    // 1b. Guard Layer + Query Rewriting (one combined LLM call)
    const { inScope, rewritten: rewrittenQ } = await preProcessQuestion(client, question)

    // ── Guard: reject off-topic questions immediately ──────────────────────
    if (!inScope) {
      return {
        answer:
          '抱歉，這個問題超出了 SkillCraft IMS 的業務範疇。\n\n我只能回答與進銷存業務相關的問題，例如：\n- 庫存狀況與低庫存警示\n- 銷售業績與訂單統計\n- 採購管理與待處理事項\n- 客戶應收帳款\n- 供應商應付帳款\n\n請嘗試詢問你的業務資料！',
        context: '【問題防護】偵測到問題與進銷存業務無關，已拒絕回答，不執行 Retrieval。',
        inputTokens: 0,
        outputTokens: 0,
        followups: ['目前哪些商品庫存不足？', '本月銷售業績如何？', '有哪些待處理的訂單？'],
        faithfulness: { score: 100, note: '問題超出業務範疇，系統防護層已攔截' }
      }
    }

    // ── Step 2: Classify topics (Adaptive Retrieval) + Model routing ─────
    const topics = classifyTopics(rewrittenQ)
    const selectedModel = classifyComplexity(rewrittenQ) === 'sonnet' ? MODEL_SONNET : MODEL_HAIKU
    const topicNames = [
      topics.inventory && '庫存',
      topics.sales && '銷售',
      topics.customers && '客戶應收',
      topics.suppliers && '供應商應付'
    ].filter(Boolean).join('、')

    // ── Entity Extraction ─────────────────────────────────────────────────
    const candidates = extractEntityCandidates(rewrittenQ)
    const entities = resolveEntities(db, candidates)
    const hasProducts = entities.products.length > 0
    const hasCustomers = entities.customers.length > 0
    const hasSuppliers = entities.suppliers.length > 0

    const metaLines: string[] = [
      `【查詢處理】`,
      rewrittenQ !== question
        ? `- 問題改寫：「${question}」→「${rewrittenQ}」`
        : `- 原始問題：「${question}」`,
      `- 時間範圍：${timeRange.label}`,
      `- 擷取資料：${topicNames}`
    ]
    if (hasProducts || hasCustomers || hasSuppliers) {
      const entityParts = [
        hasProducts && `商品「${entities.products.map((e) => e.name).join('」「')}」`,
        hasCustomers && `客戶「${entities.customers.map((e) => e.name).join('」「')}」`,
        hasSuppliers && `供應商「${entities.suppliers.map((e) => e.name).join('」「')}」`
      ].filter(Boolean).join('、')
      metaLines.push(`- 識別實體：${entityParts}`)
    }
    const metaSection = metaLines.join('\n')

    const sections: string[] = [metaSection]

    // ── Step 2: Retrieval — conditionally query SQLite ─────────────────────
    if (topics.inventory) {
      const totalProducts = (
        db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number }
      ).cnt
      const inventoryLines: string[] = [`【庫存概況】`, `- 總商品數：${totalProducts} 項`]
      if (hasProducts) {
        const ids = entities.products.map((e) => e.id).join(',')
        const entityProducts = db
          .prepare(
            `SELECT name, stock_qty, reorder_pt, sell_price, buy_price
             FROM products WHERE id IN (${ids})`
          )
          .all() as { name: string; stock_qty: number; reorder_pt: number; sell_price: number; buy_price: number }[]
        inventoryLines.push(`- 指定商品庫存詳情：`)
        entityProducts.forEach((p) => {
          const status = p.stock_qty <= p.reorder_pt ? '⚠️ 低庫存' : '正常'
          inventoryLines.push(
            `  · ${p.name}：庫存 ${p.stock_qty}，補貨點 ${p.reorder_pt}，售價 NT$${p.sell_price}，進價 NT$${p.buy_price}（${status}）`
          )
        })
      } else {
        const lowStockItems = db
          .prepare(
            `SELECT name, stock_qty, reorder_pt FROM products
             WHERE stock_qty <= reorder_pt ORDER BY stock_qty ASC LIMIT 10`
          )
          .all() as { name: string; stock_qty: number; reorder_pt: number }[]
        inventoryLines.push(`- 低庫存商品（庫存 ≤ 補貨點）：${lowStockItems.length} 項`)
        lowStockItems.forEach((p) =>
          inventoryLines.push(`  · ${p.name}：庫存 ${p.stock_qty}，補貨點 ${p.reorder_pt}`)
        )
      }
      sections.push(inventoryLines.join('\n'))
    }

    if (topics.sales) {
      const productFilter = hasProducts
        ? `AND p.id IN (${entities.products.map((e) => e.id).join(',')})`
        : ''
      const salesStats = db
        .prepare(
          `SELECT COUNT(*) as order_count,
                  ROUND(COALESCE(SUM(total_amount), 0), 0) as total_amount
           FROM sales_orders
           WHERE status = 'completed' ${dateCondition}`
        )
        .get() as { order_count: number; total_amount: number }
      const topProducts = db
        .prepare(
          `SELECT p.name, SUM(si.quantity) as qty,
                  ROUND(SUM(si.quantity * si.unit_price), 0) as amount
           FROM sale_items si
           JOIN products p ON si.product_id = p.id
           JOIN sales_orders so ON si.sales_order_id = so.id
           WHERE so.status = 'completed' ${dateCondition} ${productFilter}
           GROUP BY p.id ORDER BY qty DESC LIMIT ${hasProducts ? 20 : 5}`
        )
        .all() as { name: string; qty: number; amount: number }[]
      const salesByCategory = db
        .prepare(
          `SELECT p.category, SUM(si.quantity) as qty,
                  ROUND(SUM(si.quantity * si.unit_price), 0) as amount
           FROM sale_items si
           JOIN products p ON si.product_id = p.id
           JOIN sales_orders so ON si.sales_order_id = so.id
           WHERE so.status = 'completed' ${dateCondition}
           GROUP BY p.category ORDER BY amount DESC LIMIT 5`
        )
        .all() as { category: string; qty: number; amount: number }[]
      const pendingSales = db
        .prepare(
          `SELECT COUNT(*) as cnt, ROUND(COALESCE(SUM(total_amount), 0), 0) as total
           FROM sales_orders WHERE status IN ('pending', 'confirmed')`
        )
        .get() as { cnt: number; total: number }
      sections.push(
        [
          `【近 30 天銷售】`,
          `- 完成訂單數：${salesStats.order_count} 筆`,
          `- 銷售總額：NT$${salesStats.total_amount.toLocaleString()}`,
          `- 銷量前 5 名商品：`,
          ...(topProducts.length > 0
            ? topProducts.map(
                (p, i) => `  ${i + 1}. ${p.name}：售出 ${p.qty} 件，金額 NT$${p.amount.toLocaleString()}`
              )
            : ['  （近 30 天無銷售資料）']),
          `- 各分類銷售：`,
          ...(salesByCategory.length > 0
            ? salesByCategory.map((c) => `  · ${c.category}：${c.qty} 件，NT$${c.amount.toLocaleString()}`)
            : ['  （無資料）']),
          `- 待處理銷售單：${pendingSales.cnt} 筆，金額 NT$${pendingSales.total.toLocaleString()}`
        ].join('\n')
      )
    }

    if (topics.customers) {
      const customerFilter = hasCustomers
        ? `AND c.id IN (${entities.customers.map((e) => e.id).join(',')})`
        : ''
      const customerCount = (
        db.prepare('SELECT COUNT(*) as cnt FROM customers').get() as { cnt: number }
      ).cnt
      const unpaidSales = (
        db
          .prepare(
            `SELECT ROUND(COALESCE(SUM(total_amount), 0), 0) as total
             FROM sales_orders WHERE payment_status = 'unpaid' AND status = 'completed'`
          )
          .get() as { total: number }
      ).total
      const topUnpaidCustomers = db
        .prepare(
          `SELECT c.name, ROUND(SUM(so.total_amount), 0) as unpaid
           FROM sales_orders so
           JOIN customers c ON so.customer_id = c.id
           WHERE so.payment_status = 'unpaid' AND so.status = 'completed' ${customerFilter}
           GROUP BY c.id ORDER BY unpaid DESC LIMIT ${hasCustomers ? 20 : 5}`
        )
        .all() as { name: string; unpaid: number }[]
      sections.push(
        [
          `【客戶應收帳款】`,
          `- 客戶數：${customerCount} 位`,
          `- 應收未付總計：NT$${unpaidSales.toLocaleString()}`,
          `- 應收未付前 5 名客戶：`,
          ...(topUnpaidCustomers.length > 0
            ? topUnpaidCustomers.map((c, i) => `  ${i + 1}. ${c.name}：NT$${c.unpaid.toLocaleString()}`)
            : ['  （無未付款客戶）'])
        ].join('\n')
      )
    }

    if (topics.suppliers) {
      const supplierFilter = hasSuppliers
        ? `AND s.id IN (${entities.suppliers.map((e) => e.id).join(',')})`
        : ''
      const supplierCount = (
        db.prepare('SELECT COUNT(*) as cnt FROM suppliers').get() as { cnt: number }
      ).cnt
      const unpaidPurchases = (
        db
          .prepare(
            `SELECT ROUND(COALESCE(SUM(total_amount), 0), 0) as total
             FROM purchase_orders WHERE payment_status = 'unpaid' AND status = 'completed'`
          )
          .get() as { total: number }
      ).total
      const topUnpaidSuppliers = db
        .prepare(
          `SELECT s.name, ROUND(SUM(po.total_amount), 0) as unpaid
           FROM purchase_orders po
           JOIN suppliers s ON po.supplier_id = s.id
           WHERE po.payment_status = 'unpaid' AND po.status = 'completed' ${supplierFilter}
           GROUP BY s.id ORDER BY unpaid DESC LIMIT ${hasSuppliers ? 20 : 5}`
        )
        .all() as { name: string; unpaid: number }[]
      const pendingPurchases = db
        .prepare(
          `SELECT COUNT(*) as cnt, ROUND(COALESCE(SUM(total_amount), 0), 0) as total
           FROM purchase_orders WHERE status IN ('pending', 'ordered')`
        )
        .get() as { cnt: number; total: number }
      sections.push(
        [
          `【供應商應付帳款】`,
          `- 供應商數：${supplierCount} 家`,
          `- 待處理採購單：${pendingPurchases.cnt} 筆，金額 NT$${pendingPurchases.total.toLocaleString()}`,
          `- 應付未付總計：NT$${unpaidPurchases.toLocaleString()}`,
          `- 應付未付前 5 名供應商：`,
          ...(topUnpaidSuppliers.length > 0
            ? topUnpaidSuppliers.map((s, i) => `  ${i + 1}. ${s.name}：NT$${s.unpaid.toLocaleString()}`)
            : ['  （無未付款供應商）'])
        ].join('\n')
      )
    }

    const context = sections.join('\n\n')

    // ── Step 3: Load history + summarize if too long ──────────────────────
    const rawHistory: { role: 'user' | 'assistant'; content: string }[] = sessionId
      ? (db
          .prepare(`SELECT role, content FROM ai_chat_messages WHERE session_id = ? ORDER BY id ASC`)
          .all(sessionId) as { role: 'user' | 'assistant'; content: string }[])
      : []

    const { history: historyMessages, summaryNote } = await buildHistoryWithSummary(client, rawHistory)

    // ── Step 4: Generation — streaming Claude API ──────────────────────────
    const systemPrompt =
      '你是 SkillCraft IMS 進銷存系統的 AI 助手。\n' +
      '請嚴格根據下方【最新業務資料】回答使用者的問題。\n' +
      '如果資料不足以回答，請說明限制，不要捏造數字。\n' +
      '回答請使用繁體中文，條列式整理，簡潔有重點。\n' +
      '在回答最後另起一行，輸出 3 個相關追問（只輸出這一行）：\n' +
      '[FQ]: 問題1 | 問題2 | 問題3\n\n' +
      `【最新業務資料】\n${context}${summaryNote}`

    const stream = client.messages.stream({
      model: selectedModel,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [...historyMessages, { role: 'user', content: question }]
    })

    let fullText = ''
    stream.on('text', (text) => {
      fullText += text
      if (!_e.sender.isDestroyed()) {
        _e.sender.send('ai:chat:stream', { text })
      }
    })

    const finalMsg = await stream.finalMessage()
    const inputTokens = finalMsg.usage.input_tokens
    const outputTokens = finalMsg.usage.output_tokens

    // Parse [FQ]: followup line from answer
    const fqMatch = fullText.match(/\n?\[FQ\]:\s*(.+?)(?:\n|$)/)
    const followups = fqMatch
      ? fqMatch[1].split('|').map((s) => s.trim()).filter(Boolean).slice(0, 3)
      : []
    const answer = fullText.replace(/\n?\[FQ\]:[^\n]*/m, '').trimEnd()

    // ── Step 5: RAG Faithfulness Evaluation ───────────────────────────────
    const faithfulness = await evaluateFaithfulness(client, context, answer)

    // Persist messages and update session
    if (sessionId) {
      const isFirstMessage = historyMessages.length === 0
      db.prepare(`INSERT INTO ai_chat_messages (session_id, role, content) VALUES (?, 'user', ?)`)
        .run(sessionId, question)
      db.prepare(
        `INSERT INTO ai_chat_messages (session_id, role, content, context) VALUES (?, 'assistant', ?, ?)`
      ).run(sessionId, answer, context)
      if (isFirstMessage) {
        const title = question.length > 30 ? question.slice(0, 30) + '…' : question
        db.prepare(`UPDATE ai_chat_sessions SET title = ?, updated_at = datetime('now') WHERE id = ?`)
          .run(title, sessionId)
      } else {
        db.prepare(`UPDATE ai_chat_sessions SET updated_at = datetime('now') WHERE id = ?`)
          .run(sessionId)
      }
    }

    return { answer, context, inputTokens, outputTokens, followups, faithfulness, modelUsed: selectedModel }
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
