import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { purgeDemoData } from '@/lib/purgeDemoData'
import {
  Play, ChevronRight, RotateCcw, X, ChevronDown, ChevronUp,
  Loader2, CheckCircle2, AlertCircle, Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDemoStore } from '@/stores/demo.store'
import { DEMO_STEPS } from '@/lib/demoSteps'
import { useLangStore } from '@/stores/lang.store'
import { DemoFormOverlay } from './DemoFormOverlay'

const STEP_ROUTES = [
  '/suppliers',  // 0: 建立供應商
  '/customers',  // 1: 建立客戶
  '/products',   // 2: 建立商品
  '/purchases',  // 3: 建立採購單
  '/purchases',  // 4: 確認收貨
  '/sales',      // 5: 建立銷售單
  '/sales',      // 6: 完成出貨
  '/',           // 7: 查看 Dashboard
]

const TOTAL_STEPS = DEMO_STEPS.length

/** Generate a fresh random suffix each call to avoid UNIQUE constraint on re-run */
const freshSuffix = () => Math.random().toString(36).slice(2, 8).toUpperCase()

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Typewriter animation: types one character at a time */
async function animateType(key: string, value: string, charDelay = 42) {
  for (let i = 1; i <= value.length; i++) {
    useDemoStore.getState().setTypingField(key, value.slice(0, i))
    await sleep(charDelay)
  }
  useDemoStore.getState().markFieldDone(key)
  await sleep(350) // pause before next field
}

/** Pause until user clicks "確認送出" in DemoFormOverlay.
 *  The callback clears itself before resolving to prevent any double-trigger. */
function waitForUserSubmit(): Promise<void> {
  return new Promise((resolve) => {
    const once = () => {
      useDemoStore.getState().setSubmitCallback(null) // clear first
      resolve()
    }
    useDemoStore.getState().setSubmitCallback(once)
    useDemoStore.getState().setFormWaiting(true)
  })
}

export function DemoController() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { lang } = useLangStore()
  const {
    isActive, currentStep, stepStatus, stepError, demoIds, collapsed, formOverlay,
    setStepStatus, advanceStep, setDemoIds, toggleCollapsed, endDemo,
    openFormOverlay, setFormSubmitting, closeFormOverlay, setSpotlight,
  } = useDemoStore()

  const isZh = lang === 'zh'
  const t = (obj: { zh: string; en: string }) => obj[lang]
  const isWaitingSubmit = formOverlay?.waitingForSubmit ?? false
  const runningRef = useRef(false) // prevent concurrent runStep executions

  // Persist demoIds to localStorage so the next run can clean up
  useEffect(() => {
    if (Object.keys(demoIds).length > 0) {
      localStorage.setItem('skillcraft-demo-ids', JSON.stringify(demoIds))
    }
  }, [demoIds])

  // Navigate and set spotlight when step changes
  useEffect(() => {
    if (!isActive) {
      setSpotlight(null)
      return
    }
    navigate(STEP_ROUTES[currentStep])
    if (currentStep === TOTAL_STEPS - 1) {
      setTimeout(() => setStepStatus('done'), 400)
    }
    // Spotlight the action button for receive/complete steps
    if (currentStep === 4) {
      const { purchaseId } = useDemoStore.getState().demoIds
      if (purchaseId) setSpotlight({ type: 'purchase', id: purchaseId })
    } else if (currentStep === 6) {
      const { salesId } = useDemoStore.getState().demoIds
      if (salesId) setSpotlight({ type: 'sales', id: salesId })
    } else {
      setSpotlight(null)
    }
  }, [isActive, currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isActive) return null

  const step = DEMO_STEPS[currentStep]
  const isSummaryStep = currentStep === TOTAL_STEPS - 1
  const progress = ((currentStep + (stepStatus === 'done' ? 1 : 0)) / TOTAL_STEPS) * 100

  const runStep = async () => {
    if (runningRef.current) return
    runningRef.current = true
    setStepStatus('running')
    try {
      switch (currentStep) {

        // ── Step 0: 建立供應商 ──────────────────────────────────
        case 0: {
          openFormOverlay({
            title: { zh: '新增供應商', en: 'New Supplier' },
            subtitle: { zh: '設定上游廠商資料', en: 'Set up upstream vendor info' },
            fields: [
              { key: 'name',    label: { zh: '公司名稱', en: 'Company Name' }, typed: '', targetValue: '[Demo] 台灣科技有限公司', done: false },
              { key: 'contact', label: { zh: '聯絡人',   en: 'Contact Person' }, typed: '', targetValue: 'Demo 陳業務', done: false },
              { key: 'phone',   label: { zh: '電話',     en: 'Phone' },         typed: '', targetValue: '02-8888-0000', done: false },
              { key: 'email',   label: { zh: 'Email',    en: 'Email' },         typed: '', targetValue: 'demo@techsupply.tw', done: false },
            ],
          })
          await sleep(600)
          await animateType('name',    '[Demo] 台灣科技有限公司')
          await animateType('contact', 'Demo 陳業務')
          await animateType('phone',   '02-8888-0000')
          await animateType('email',   'demo@techsupply.tw')
          await waitForUserSubmit()
          setFormSubmitting(true)
          const s = await window.electronAPI.suppliers.create({
            name: '[Demo] 台灣科技有限公司', contact: 'Demo 陳業務',
            phone: '02-8888-0000', email: 'demo@techsupply.tw',
            address: '台北市中山區', notes: 'Live Demo 資料',
          })
          setDemoIds({ supplierId: s.id })
          queryClient.invalidateQueries({ queryKey: ['suppliers'] })
          await sleep(400)
          closeFormOverlay()
          break
        }

        // ── Step 1: 建立客戶 ────────────────────────────────────
        case 1: {
          openFormOverlay({
            title: { zh: '新增客戶', en: 'New Customer' },
            subtitle: { zh: '設定下游買家資料', en: 'Set up downstream buyer info' },
            fields: [
              { key: 'name',    label: { zh: '公司名稱', en: 'Company Name' }, typed: '', targetValue: '[Demo] 線上電商公司', done: false },
              { key: 'contact', label: { zh: '聯絡人',   en: 'Contact Person' }, typed: '', targetValue: 'Demo 林採購', done: false },
              { key: 'phone',   label: { zh: '電話',     en: 'Phone' },         typed: '', targetValue: '02-7777-0000', done: false },
              { key: 'email',   label: { zh: 'Email',    en: 'Email' },         typed: '', targetValue: 'demo@ecom.tw', done: false },
            ],
          })
          await sleep(600)
          await animateType('name',    '[Demo] 線上電商公司')
          await animateType('contact', 'Demo 林採購')
          await animateType('phone',   '02-7777-0000')
          await animateType('email',   'demo@ecom.tw')
          await waitForUserSubmit()
          setFormSubmitting(true)
          const c = await window.electronAPI.customers.create({
            name: '[Demo] 線上電商公司', contact: 'Demo 林採購',
            phone: '02-7777-0000', email: 'demo@ecom.tw',
            address: '台北市信義區', notes: 'Live Demo 資料',
          })
          setDemoIds({ customerId: c.id })
          queryClient.invalidateQueries({ queryKey: ['customers'] })
          await sleep(400)
          closeFormOverlay()
          break
        }

        // ── Step 2: 建立商品 ────────────────────────────────────
        case 2: {
          const sku = `DEMO-HUB-${freshSuffix()}`
          openFormOverlay({
            title: { zh: '新增商品（SKU）', en: 'New Product (SKU)' },
            subtitle: { zh: '定義庫存單位與定價', en: 'Define stock unit and pricing' },
            fields: [
              { key: 'name',       label: { zh: '商品名稱', en: 'Product Name' }, typed: '', targetValue: '[Demo] USB-C Hub 7合1', done: false },
              { key: 'sku',        label: { zh: 'SKU 編號', en: 'SKU Code' },     typed: '', targetValue: sku, done: false },
              { key: 'category',   label: { zh: '類別',     en: 'Category' },     typed: '', targetValue: '電子產品', done: false },
              { key: 'buy_price',  label: { zh: '進價（成本）', en: 'Buy Price' }, typed: '', targetValue: '350', done: false, fieldType: 'number' },
              { key: 'sell_price', label: { zh: '售價',     en: 'Sell Price' },   typed: '', targetValue: '599', done: false, fieldType: 'number' },
              { key: 'reorder',    label: { zh: '補貨點',   en: 'Reorder Point' }, typed: '', targetValue: '10', done: false, fieldType: 'number' },
            ],
          })
          await sleep(600)
          await animateType('name',       '[Demo] USB-C Hub 7合1')
          await animateType('sku',        sku)
          await animateType('category',   '電子產品')
          await animateType('buy_price',  '350', 90)
          await animateType('sell_price', '599', 90)
          await animateType('reorder',    '10',  120)
          await waitForUserSubmit()
          setFormSubmitting(true)
          const p = await window.electronAPI.products.create({
            sku, name: '[Demo] USB-C Hub 7合1',
            category: '電子產品', unit: '個',
            buy_price: 350, sell_price: 599, stock_qty: 0, reorder_pt: 10,
            description: 'Live Demo 範例商品',
          })
          setDemoIds({ productId: p.id })
          queryClient.invalidateQueries({ queryKey: ['products'] })
          await sleep(400)
          closeFormOverlay()
          break
        }

        // ── Step 3: 建立採購單 ──────────────────────────────────
        case 3: {
          openFormOverlay({
            title: { zh: '新增採購單', en: 'New Purchase Order' },
            subtitle: { zh: '向供應商下訂，庫存尚未增加', en: 'Order from supplier — stock not yet increased' },
            fields: [
              { key: 'supplier', label: { zh: '供應商',     en: 'Supplier' },   typed: '', targetValue: '[Demo] 台灣科技有限公司', done: false },
              { key: 'product',  label: { zh: '商品',       en: 'Product' },    typed: '', targetValue: '[Demo] USB-C Hub 7合1', done: false },
              { key: 'qty',      label: { zh: '訂購數量',   en: 'Quantity' },   typed: '', targetValue: '50', done: false, fieldType: 'number' },
              { key: 'price',    label: { zh: '單價',       en: 'Unit Price' }, typed: '', targetValue: '350', done: false, fieldType: 'number' },
            ],
          })
          await sleep(600)
          await animateType('supplier', '[Demo] 台灣科技有限公司')
          await animateType('product',  '[Demo] USB-C Hub 7合1')
          await animateType('qty',      '50',  100)
          await animateType('price',    '350', 90)
          await waitForUserSubmit()
          setFormSubmitting(true)
          const po = await window.electronAPI.purchases.create({
            supplier_id: demoIds.supplierId,
            order_date: new Date().toISOString().slice(0, 10),
            notes: 'Live Demo 採購單',
            items: [{ product_id: demoIds.productId, quantity: 50, unit_price: 350 }],
          })
          setDemoIds({ purchaseId: po.id })
          queryClient.invalidateQueries({ queryKey: ['purchases'] })
          await sleep(400)
          closeFormOverlay()
          break
        }

        // ── Step 4: 確認收貨 ────────────────────────────────────
        case 4: {
          openFormOverlay({
            title: { zh: '確認收貨（入庫）', en: 'Confirm Goods Receipt' },
            subtitle: { zh: '貨物到達，庫存正式增加', en: 'Goods arrived — inventory officially increases' },
            fields: [
              { key: 'po',      label: { zh: '採購單',     en: 'Purchase Order' },     typed: '', targetValue: '採購單已建立', done: false },
              { key: 'product', label: { zh: '商品',       en: 'Product' },            typed: '', targetValue: '[Demo] USB-C Hub 7合1 × 50 件', done: false },
              { key: 'cost',    label: { zh: '採購金額',   en: 'Total Cost' },         typed: '', targetValue: '$17,500', done: false },
              { key: 'result',  label: { zh: '入庫後庫存', en: 'Stock After Receipt' }, typed: '', targetValue: '0 件 → 50 件', done: false },
            ],
          })
          await sleep(600)
          await animateType('po',      '採購單已建立', 55)
          await animateType('product', '[Demo] USB-C Hub 7合1 × 50 件', 38)
          await animateType('cost',    '$17,500', 80)
          await animateType('result',  '0 件 → 50 件', 70)
          await waitForUserSubmit()
          setFormSubmitting(true)
          await window.electronAPI.purchases.receive(demoIds.purchaseId!)
          queryClient.invalidateQueries({ queryKey: ['purchases'] })
          queryClient.invalidateQueries({ queryKey: ['products'] })
          await sleep(400)
          closeFormOverlay()
          break
        }

        // ── Step 5: 建立銷售單 ──────────────────────────────────
        case 5: {
          openFormOverlay({
            title: { zh: '新增銷售單', en: 'New Sales Order' },
            subtitle: { zh: '接受客戶訂單，庫存尚未扣減', en: 'Accept customer order — stock not yet deducted' },
            fields: [
              { key: 'customer', label: { zh: '客戶',     en: 'Customer' },   typed: '', targetValue: '[Demo] 線上電商公司', done: false },
              { key: 'product',  label: { zh: '商品',     en: 'Product' },    typed: '', targetValue: '[Demo] USB-C Hub 7合1', done: false },
              { key: 'qty',      label: { zh: '銷售數量', en: 'Quantity' },   typed: '', targetValue: '12', done: false, fieldType: 'number' },
              { key: 'price',    label: { zh: '單價',     en: 'Unit Price' }, typed: '', targetValue: '599', done: false, fieldType: 'number' },
            ],
          })
          await sleep(600)
          await animateType('customer', '[Demo] 線上電商公司')
          await animateType('product',  '[Demo] USB-C Hub 7合1')
          await animateType('qty',      '12',  110)
          await animateType('price',    '599', 90)
          await waitForUserSubmit()
          setFormSubmitting(true)
          const so = await window.electronAPI.sales.create({
            customer_id: demoIds.customerId,
            order_date: new Date().toISOString().slice(0, 10),
            notes: 'Live Demo 銷售單',
            items: [{ product_id: demoIds.productId, quantity: 12, unit_price: 599 }],
          })
          setDemoIds({ salesId: so.id })
          queryClient.invalidateQueries({ queryKey: ['sales'] })
          await sleep(400)
          closeFormOverlay()
          break
        }

        // ── Step 6: 完成出貨 ────────────────────────────────────
        case 6: {
          openFormOverlay({
            title: { zh: '確認出貨（出庫）', en: 'Confirm Goods Issue' },
            subtitle: { zh: '商品出庫，庫存正式扣減，計算毛利', en: 'Goods issued — stock deducted and gross profit calculated' },
            fields: [
              { key: 'so',      label: { zh: '銷售單',     en: 'Sales Order' },       typed: '', targetValue: '銷售單已建立', done: false },
              { key: 'product', label: { zh: '商品',       en: 'Product' },           typed: '', targetValue: '[Demo] USB-C Hub 7合1 × 12 件', done: false },
              { key: 'stock',   label: { zh: '出庫後庫存', en: 'Stock After Issue' }, typed: '', targetValue: '50 件 → 38 件', done: false },
              { key: 'profit',  label: { zh: '本筆毛利',   en: 'Gross Profit' },      typed: '', targetValue: '$2,988  (= ($599 - $350) × 12)', done: false },
            ],
          })
          await sleep(600)
          await animateType('so',      '銷售單已建立', 55)
          await animateType('product', '[Demo] USB-C Hub 7合1 × 12 件', 38)
          await animateType('stock',   '50 件 → 38 件', 70)
          await animateType('profit',  '$2,988  (= ($599 - $350) × 12)', 32)
          await waitForUserSubmit()
          setFormSubmitting(true)
          const result = await window.electronAPI.sales.complete(demoIds.salesId!)
          if (!result.success) throw new Error(result.error)
          queryClient.invalidateQueries({ queryKey: ['sales'] })
          queryClient.invalidateQueries({ queryKey: ['products'] })
          queryClient.invalidateQueries({ queryKey: ['reports', 'kpis'] })
          await sleep(400)
          closeFormOverlay()
          break
        }
      }

      setStepStatus('done')
    } catch (err) {
      closeFormOverlay()
      setStepStatus('error', err instanceof Error ? err.message : String(err))
    } finally {
      runningRef.current = false
    }
  }

  const handleNext = () => {
    advanceStep()
  }

  const handleClearAndEnd = () => {
    setSpotlight(null)
    closeFormOverlay()
    endDemo()
    navigate('/')
    purgeDemoData().then(() => queryClient.invalidateQueries())
  }

  return (
    <>
      {/* Animated form dialog — z-40, below bottom panel */}
      <DemoFormOverlay />

      {/* Bottom controller panel — z-50 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">

          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Collapsed header — always visible */}
          <div
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors select-none"
            onClick={toggleCollapsed}
          >
            <span className="text-base">{step.emoji}</span>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground shrink-0">
                {isZh ? `步驟 ${currentStep + 1}/${TOTAL_STEPS}` : `Step ${currentStep + 1}/${TOTAL_STEPS}`}
              </span>
              <span className="text-sm font-medium truncate">{t(step.title)}</span>
              {stepStatus === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />}
              {stepStatus === 'done'    && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />}
              {stepStatus === 'error'   && <AlertCircle  className="w-3.5 h-3.5 text-red-400 shrink-0" />}
            </div>
            <span className="text-xs text-primary font-medium shrink-0">Live Demo</span>
            {/* Collapse hint — only when form is waiting for submit and panel is open */}
            {isWaitingSubmit && !collapsed && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 animate-pulse shrink-0">
                <ChevronUp className="w-3.5 h-3.5" />
                {isZh ? '點此摺疊' : 'Collapse'}
              </span>
            )}
            {(!isWaitingSubmit || collapsed) && (
              collapsed
                ? <ChevronUp   className="w-4 h-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </div>

          {/* Expanded content */}
          {!collapsed && (
            <div className="border-t border-border">
              <div className="flex gap-4 p-4">

                {/* Step info */}
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                      {t(step.tag)}
                    </span>
                    {isSummaryStep && stepStatus === 'done' && (
                      <span className="text-xs text-green-400 font-medium">
                        {isZh ? '✓ 進銷存閉環完成！' : '✓ IMS closed-loop complete!'}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">{t(step.description)}</p>

                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 flex gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{t(step.concept)}</p>
                  </div>

                  {stepStatus === 'error' && (
                    <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded px-3 py-2">
                      {stepError}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 shrink-0 w-40 justify-end">
                  {stepStatus === 'idle' && !isSummaryStep && (
                    <Button size="sm" onClick={runStep} className="gap-1.5 w-full">
                      <Play className="w-3 h-3" />
                      {isZh ? '執行此步驟' : 'Run This Step'}
                    </Button>
                  )}
                  {stepStatus === 'running' && (
                    <Button size="sm" disabled className="gap-1.5 w-full">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {isZh ? '執行中...' : 'Running...'}
                    </Button>
                  )}
                  {stepStatus === 'done' && !isSummaryStep && (
                    <Button size="sm" onClick={handleNext} className="gap-1.5 w-full">
                      {isZh ? '下一步' : 'Next'}
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                  {stepStatus === 'error' && (
                    <Button size="sm" variant="destructive" onClick={runStep} className="gap-1.5 w-full">
                      <RotateCcw className="w-3 h-3" />
                      {isZh ? '重試' : 'Retry'}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearAndEnd}
                    disabled={stepStatus === 'running'}
                    className="gap-1.5 w-full text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <X className="w-3 h-3" />
                    {isZh ? '結束 Demo' : 'End Demo'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
