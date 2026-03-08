import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Play, Trash2, CheckCircle2, Loader2, Circle, AlertCircle, Lightbulb, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DEMO_STEPS } from '@/lib/demoSteps'
import { useLangStore } from '@/stores/lang.store'

type RunState = 'idle' | 'running' | 'completed' | 'error'

interface DemoIds {
  supplierId?: number
  customerId?: number
  productId?: number
  purchaseId?: number
  salesId?: number
}

interface LogEntry {
  stepIndex: number
  result: string
  success: boolean
}

const STEP_DELAY = 1800 // ms between steps

export function LiveDemoOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLangStore()
  const queryClient = useQueryClient()
  const [runState, setRunState] = useState<RunState>('idle')
  const [currentStep, setCurrentStep] = useState(-1)
  const [log, setLog] = useState<LogEntry[]>([])
  const demoIds = useRef<DemoIds>({})
  const logEndRef = useRef<HTMLDivElement>(null)

  const t = (obj: { zh: string; en: string }) => obj[lang]

  useEffect(() => {
    if (open) {
      setRunState('idle')
      setCurrentStep(-1)
      setLog([])
      demoIds.current = {}
    }
  }, [open])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  if (!open) return null

  const addLog = (stepIndex: number, result: string, success = true) => {
    setLog((prev) => [...prev, { stepIndex, result, success }])
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const runDemo = async () => {
    setRunState('running')
    setLog([])
    demoIds.current = {}

    try {
      // Step 0: 供應商
      setCurrentStep(0)
      await sleep(STEP_DELAY)
      const supplier = await window.electronAPI.suppliers.create({
        name: '[Demo] 台灣科技有限公司', contact: 'Demo 陳經理',
        phone: '02-8888-0000', email: 'demo@techsupply.tw', address: '台北市中山區', notes: 'Live Demo 資料'
      })
      demoIds.current.supplierId = supplier.id
      addLog(0, lang === 'zh' ? `✓ 已建立供應商 ID #${supplier.id}` : `✓ Supplier created ID #${supplier.id}`)

      // Step 1: 客戶
      setCurrentStep(1)
      await sleep(STEP_DELAY)
      const customer = await window.electronAPI.customers.create({
        name: '[Demo] 線上電商公司', contact: 'Demo 林業務',
        phone: '02-7777-0000', email: 'demo@ecom.tw', address: '台北市信義區', notes: 'Live Demo 資料'
      })
      demoIds.current.customerId = customer.id
      addLog(1, lang === 'zh' ? `✓ 已建立客戶 ID #${customer.id}` : `✓ Customer created ID #${customer.id}`)

      // Step 2: 商品
      setCurrentStep(2)
      await sleep(STEP_DELAY)
      const product = await window.electronAPI.products.create({
        sku: 'DEMO-HUB-001', name: '[Demo] USB-C Hub 7合1',
        category: '電子產品', unit: '個',
        buy_price: 350, sell_price: 599, stock_qty: 0, reorder_pt: 10,
        description: 'Live Demo 範例商品'
      })
      demoIds.current.productId = product.id
      addLog(2, lang === 'zh'
        ? `✓ 已建立商品 SKU: DEMO-HUB-001，庫存 0 件`
        : `✓ Product created SKU: DEMO-HUB-001, stock: 0`)

      // Step 3: 採購單
      setCurrentStep(3)
      await sleep(STEP_DELAY)
      const purchase = await window.electronAPI.purchases.create({
        supplier_id: supplier.id,
        order_date: new Date().toISOString().slice(0, 10),
        notes: 'Live Demo 採購單',
        items: [{ product_id: product.id, quantity: 50, unit_price: 350 }]
      })
      demoIds.current.purchaseId = purchase.id
      addLog(3, lang === 'zh'
        ? `✓ 採購單 ${purchase.order_no} 已建立，金額 $17,500`
        : `✓ PO ${purchase.order_no} created, total $17,500`)

      // Step 4: 收貨
      setCurrentStep(4)
      await sleep(STEP_DELAY)
      await window.electronAPI.purchases.receive(purchase.id)
      addLog(4, lang === 'zh'
        ? `✓ 收貨完成，庫存 0 → 50 件`
        : `✓ Goods received, stock 0 → 50 units`)

      // Step 5: 銷售單
      setCurrentStep(5)
      await sleep(STEP_DELAY)
      const sale = await window.electronAPI.sales.create({
        customer_id: customer.id,
        order_date: new Date().toISOString().slice(0, 10),
        notes: 'Live Demo 銷售單',
        items: [{ product_id: product.id, quantity: 12, unit_price: 599 }]
      })
      demoIds.current.salesId = sale.id
      addLog(5, lang === 'zh'
        ? `✓ 銷售單 ${sale.order_no} 已建立，金額 $7,188`
        : `✓ SO ${sale.order_no} created, total $7,188`)

      // Step 6: 完成銷售
      setCurrentStep(6)
      await sleep(STEP_DELAY)
      const result = await window.electronAPI.sales.complete(sale.id)
      if (!result.success) throw new Error(result.error)
      addLog(6, lang === 'zh'
        ? `✓ 出庫完成，庫存 50 → 38 件，毛利 $2,988`
        : `✓ Goods issued, stock 50 → 38, gross profit $2,988`)

      // Step 7: 完成
      setCurrentStep(7)
      await sleep(STEP_DELAY)
      addLog(7, lang === 'zh'
        ? `🎉 進銷存完整流程示範結束！`
        : `🎉 Full IMS cycle demonstration complete!`)

      queryClient.invalidateQueries()
      setRunState('completed')

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog(currentStep, `✗ ${msg}`, false)
      setRunState('error')
    }
  }

  const clearDemo = async () => {
    const ids = demoIds.current
    try {
      if (ids.salesId) await window.electronAPI.sales.delete(ids.salesId).catch(() => null)
      if (ids.purchaseId) await window.electronAPI.purchases.delete(ids.purchaseId).catch(() => null)
      if (ids.productId) await window.electronAPI.products.delete(ids.productId).catch(() => null)
      if (ids.customerId) await window.electronAPI.customers.delete(ids.customerId).catch(() => null)
      if (ids.supplierId) await window.electronAPI.suppliers.delete(ids.supplierId).catch(() => null)
      queryClient.invalidateQueries()
      demoIds.current = {}
    } catch { /* ignore */ }
    onClose()
  }

  const progress = currentStep < 0 ? 0 : Math.round(((currentStep + (runState === 'completed' ? 1 : 0)) / DEMO_STEPS.length) * 100)
  const activeStep = currentStep >= 0 ? DEMO_STEPS[currentStep] : DEMO_STEPS[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎬</span>
            <div>
              <h2 className="text-base font-semibold">
                {lang === 'zh' ? 'Live Demo — 進銷存系統操作展示' : 'Live Demo — IMS Workflow Walkthrough'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'zh' ? '自動執行完整進銷存流程，了解系統設計邏輯' : 'Auto-run the complete IMS cycle and understand the design logic'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted shrink-0">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left: Current Step */}
          <div className="w-1/2 p-6 border-r border-border overflow-y-auto flex flex-col gap-4">
            {runState === 'idle' ? (
              <div className="flex flex-col gap-4 h-full justify-center">
                <div className="text-5xl text-center mb-2">🚀</div>
                <h3 className="text-lg font-semibold text-center">
                  {lang === 'zh' ? '準備開始 Demo' : 'Ready to Start Demo'}
                </h3>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  {lang === 'zh'
                    ? '點擊「開始 Demo」，系統將自動執行 8 個步驟，完整展示進銷存閉環流程，並在每個步驟說明背後的業務邏輯。'
                    : 'Click "Start Demo" to auto-run 8 steps demonstrating the complete IMS closed-loop, with the business logic explained at each step.'}
                </p>
                <div className="flex flex-col gap-2 mt-2">
                  {DEMO_STEPS.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <span className="text-base w-5 text-center">{step.emoji}</span>
                      <span className="text-xs text-muted-foreground/60 w-4">{i + 1}.</span>
                      <span>{t(step.title)}</span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground/70">{t(step.tag)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Step badge */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                    {t(activeStep.tag)}
                  </span>
                  <span className="text-muted-foreground">
                    {lang === 'zh' ? `步驟 ${Math.max(currentStep, 0) + 1} / ${DEMO_STEPS.length}` : `Step ${Math.max(currentStep, 0) + 1} / ${DEMO_STEPS.length}`}
                  </span>
                </div>

                {/* Step title */}
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{activeStep.emoji}</span>
                  <div>
                    <h3 className="text-xl font-bold">{t(activeStep.title)}</h3>
                    {runState === 'running' && currentStep < DEMO_STEPS.length - 1 && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-400 mt-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {lang === 'zh' ? '執行中...' : 'Running...'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed">
                  <div className="flex items-start gap-2">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-foreground">{t(activeStep.description)}</p>
                  </div>
                </div>

                {/* IMS Concept */}
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-yellow-400">
                    <Lightbulb className="w-3.5 h-3.5" />
                    {lang === 'zh' ? '進銷存概念' : 'IMS Concept'}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(activeStep.concept)}</p>
                </div>
              </>
            )}
          </div>

          {/* Right: Step Log */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border shrink-0">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {lang === 'zh' ? '執行記錄' : 'Execution Log'}
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {DEMO_STEPS.map((step, i) => {
                const logEntry = log.find((l) => l.stepIndex === i)
                const isActive = currentStep === i && runState === 'running'
                const isDone = logEntry !== undefined
                const isPending = !isDone && !isActive

                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                      isActive ? 'bg-blue-500/10 border border-blue-500/20' :
                      isDone && logEntry?.success ? 'bg-green-500/5' :
                      isDone && !logEntry?.success ? 'bg-red-500/5' :
                      'opacity-40'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isActive ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      ) : isDone && logEntry?.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : isDone && !logEntry?.success ? (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{step.emoji}</span>
                        <span className={`text-sm font-medium ${isPending ? 'text-muted-foreground/50' : 'text-foreground'}`}>
                          {t(step.title)}
                        </span>
                      </div>
                      {logEntry && (
                        <p className={`text-xs mt-0.5 ${logEntry.success ? 'text-green-400' : 'text-red-400'}`}>
                          {logEntry.result}
                        </p>
                      )}
                      {isActive && (
                        <p className="text-xs text-blue-400 mt-0.5">
                          {lang === 'zh' ? '執行中...' : 'Running...'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 bg-muted/10">
          <div className="text-xs text-muted-foreground">
            {runState === 'completed' && (
              <span className="text-green-400 font-medium">
                {lang === 'zh' ? '✓ Demo 執行完成！可清除 Demo 資料或直接關閉。' : '✓ Demo complete! Clear demo data or just close.'}
              </span>
            )}
            {runState === 'error' && (
              <span className="text-red-400">
                {lang === 'zh' ? '✗ 執行過程中發生錯誤' : '✗ An error occurred during execution'}
              </span>
            )}
            {runState === 'idle' && (
              <span>{lang === 'zh' ? 'Demo 資料會在執行後出現在系統中，可點擊「清除 Demo 資料」移除' : 'Demo data appears in the system after running. Use "Clear Demo Data" to remove it.'}</span>
            )}
          </div>
          <div className="flex gap-2">
            {(runState === 'completed' || runState === 'error') && demoIds.current.supplierId && (
              <Button variant="outline" size="sm" onClick={clearDemo} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                <Trash2 className="w-3.5 h-3.5" />
                {lang === 'zh' ? '清除 Demo 資料' : 'Clear Demo Data'}
              </Button>
            )}
            {runState === 'idle' && (
              <Button size="sm" onClick={runDemo} className="gap-1.5">
                <Play className="w-3.5 h-3.5" />
                {lang === 'zh' ? '開始 Demo' : 'Start Demo'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose} disabled={runState === 'running'}>
              {lang === 'zh' ? '關閉' : 'Close'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
