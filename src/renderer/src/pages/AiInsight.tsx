import React, { useState, useMemo, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Brain,
  AlertCircle,
  Settings,
  ShoppingCart,
  Info,
  ChevronUp,
  ChevronDown,
  Minus,
  Download,
  Target,
  MessageSquare,
  Send,
  Bot,
  User,
  ChevronRight,
  Shuffle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useLang } from '@/lib/useLang'
import { useToast } from '@/components/ui/use-toast'
import { AiForecastScope, AiForecastItem, AiForecastLatest } from '@/types/schema'
import { cn } from '@/lib/utils'
import ProductPickerDialog from '@/components/ai/ProductPickerDialog'

const QUESTION_POOL = [
  '目前哪些商品庫存不足補貨點？',
  '本月銷售業績如何？',
  '有哪些待處理的訂單？',
  '哪個客戶的未付款金額最高？',
  '目前庫存最低的前 5 項商品是哪些？',
  '近 30 天銷量最好的商品是什麼？',
  '有多少筆採購單尚未付款？',
  '有多少筆銷售單尚未付款？',
  '目前有幾位客戶和幾家供應商？',
  '應收未付款總金額是多少？',
  '應付未付款總金額是多少？',
  '近 30 天共完成幾筆銷售訂單？'
]

function pickRandom(pool: string[], n: number): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  context?: string
}

type ConfidenceFilter = 'all' | 'high' | 'low'

const SCOPES: { key: AiForecastScope; labelKey: string }[] = [
  { key: 'smart', labelKey: 'scopeSmart' },
  { key: 'low_stock', labelKey: 'scopeLowStock' },
  { key: 'top_sales', labelKey: 'scopeTopSales' },
  { key: 'custom', labelKey: 'scopeCustom' }
]

const CONFIDENCE_BADGE: Record<string, string> = {
  high: 'bg-green-500/15 text-green-600 dark:text-green-400',
  medium: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  low: 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `${hours} 小時前`
  return `${Math.floor(hours / 24)} 天前`
}

export default function AiInsight(): React.JSX.Element {
  const t = useLang()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'forecast' | 'chat'>('forecast')
  const [scope, setScope] = useState<AiForecastScope>('smart')
  const [customIds, setCustomIds] = useState<number[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dismissFreshness, setDismissFreshness] = useState(false)
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [aiError, setAiError] = useState<string | null>(null)
  const [exportPending, setExportPending] = useState(false)
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false)

  // Chat (RAG) state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const [displayedQuestions, setDisplayedQuestions] = useState<string[]>(() => pickRandom(QUESTION_POOL, 4))

  // Latest forecast from DB
  const { data: latest, isLoading: isLoadingLatest } = useQuery<AiForecastLatest | null>({
    queryKey: ['ai', 'latest'],
    queryFn: () => window.electronAPI.ai.getLatest(),
    staleTime: Infinity
  })

  const forecast = latest?.current ?? null
  const previous = latest?.previous ?? null

  // Freshness check
  const { data: freshness } = useQuery({
    queryKey: ['ai', 'freshness'],
    queryFn: () => window.electronAPI.ai.checkFreshness(),
    staleTime: 0,
    enabled: !isLoadingLatest
  })

  // Scope preview count
  const { data: preview } = useQuery({
    queryKey: ['ai', 'preview', scope, customIds],
    queryFn: () =>
      window.electronAPI.ai.previewScope({
        scope,
        productIds: scope === 'custom' ? customIds : undefined
      }),
    staleTime: 1000 * 30
  })

  const mutation = useMutation({
    mutationFn: () =>
      window.electronAPI.ai.forecast({
        scope,
        productIds: scope === 'custom' ? customIds : undefined
      }),
    onSuccess: (data) => {
      setAiError(null)
      setDismissFreshness(true)
      setSelectedIds(new Set())
      localStorage.setItem('ims-ai-last-result', JSON.stringify(data))
      queryClient.invalidateQueries({ queryKey: ['ai', 'latest'] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'freshness'] })
    },
    onError: (err: Error) => {
      const msg = err.message ?? t.ai.errorRetry
      setAiError(msg)
      toast({ title: msg, variant: 'destructive' })
    }
  })

  const applyReorderMutation = useMutation({
    mutationFn: (updates: { id: number; reorder_pt: number }[]) =>
      window.electronAPI.products.batchUpdateReorderPt(updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({ title: `已更新 ${data.updated} 項商品補貨點`, variant: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: err.message ?? '更新失敗', variant: 'destructive' })
    }
  })

  const applyableItems = useMemo(
    () => (forecast?.items ?? []).filter((i) => i.avg_daily_sales > 0),
    [forecast]
  )

  const handleApplyReorderPts = (): void => {
    const updates = applyableItems.map((i) => ({
      id: i.product_id,
      reorder_pt: Math.ceil(i.avg_daily_sales * 30 * 0.5)
    }))
    applyReorderMutation.mutate(updates)
  }

  const isNoApiKey = aiError?.includes('API Key') || aiError?.includes('api key')

  const showFreshnessBanner =
    !dismissFreshness &&
    !mutation.isPending &&
    freshness &&
    freshness.hoursSince < 24 &&
    freshness.newSalesCount < 5 &&
    forecast !== null

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!forecast) return []
    return forecast.items.filter((item) => {
      if (confidenceFilter === 'high') return item.confidence === 'high'
      if (confidenceFilter === 'low') return item.confidence === 'low'
      return true
    })
  }, [forecast, confidenceFilter])

  // Checkbox helpers
  const checkableIds = useMemo(
    () => filteredItems.filter((i) => i.suggested_reorder_qty > 0).map((i) => i.product_id),
    [filteredItems]
  )
  const allChecked = checkableIds.length > 0 && checkableIds.every((id) => selectedIds.has(id))
  const indeterminate = checkableIds.some((id) => selectedIds.has(id)) && !allChecked

  const toggleSelectAll = (): void => {
    if (allChecked) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(checkableIds))
    }
  }

  const toggleRow = (id: number): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedItems = forecast?.items.filter((i) => selectedIds.has(i.product_id)) ?? []

  // Chat handler — RAG flow: Retrieval (SQLite) → Augmented → Generation (Claude)
  const handleChatSend = async (question: string): Promise<void> => {
    const q = question.trim()
    if (!q || chatLoading) return
    setChatMessages((prev) => [...prev, { role: 'user', content: q }])
    setChatInput('')
    setChatLoading(true)
    try {
      const { answer, context } = await window.electronAPI.ai.chat(q)
      setChatMessages((prev) => [...prev, { role: 'assistant', content: answer, context }])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '查詢失敗，請稍後重試。'
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }])
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  const handleExport = async (): Promise<void> => {
    setExportPending(true)
    try {
      const res = await window.electronAPI.export.aiReport()
      if (res.success) toast({ title: '已匯出 AI 分析報告', variant: 'success' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '匯出失敗'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setExportPending(false)
    }
  }

  const handleBatchPurchase = (): void => {
    navigate('/purchases', {
      state: {
        openForm: true,
        items: selectedItems.map((i: AiForecastItem) => ({
          product_id: i.product_id,
          quantity: i.suggested_reorder_qty,
          unit_price: 0
        }))
      }
    })
  }

  const getTrend = (
    item: AiForecastItem
  ): { diff: number; label: string; className: string } | null => {
    if (!previous) return null
    const prev = previous.items.find((p) => p.product_id === item.product_id)
    if (!prev) return null
    const diff = item.suggested_reorder_qty - prev.suggested_reorder_qty
    if (diff > 0)
      return { diff, label: `▲+${diff}`, className: 'text-green-500' }
    if (diff < 0)
      return { diff, label: `▼${diff}`, className: 'text-red-400' }
    return { diff: 0, label: '=', className: 'text-muted-foreground' }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">{t.ai.title}</h1>
        </div>
        {activeTab === 'forecast' && (
          <div className="flex items-center gap-3">
            {preview && (
              <span className="text-xs text-muted-foreground">{t.ai.willAnalyze(preview.count)}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExport}
              disabled={!forecast || exportPending}
              aria-label="匯出 AI 分析報告"
            >
              <Download className="w-3.5 h-3.5" />
              {exportPending ? '匯出中...' : '匯出報告'}
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || (scope === 'custom' && customIds.length === 0)}
              className="gap-2"
            >
              {mutation.isPending ? t.ai.generating : t.ai.generate}
            </Button>
          </div>
        )}
      </div>

      {/* Tab buttons */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('forecast')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'forecast'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Brain className="w-3.5 h-3.5" />
          需求預測
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'chat'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          AI 問答
        </button>
      </div>

      {/* ── Forecast Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'forecast' && <>

      {/* Scope selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {SCOPES.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'custom') {
                setPickerOpen(true)
              } else {
                setScope(key)
              }
            }}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              scope === key
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {key === 'smart' && '★ '}
            {t.ai[labelKey as keyof typeof t.ai] as string}
            {key === 'custom' && customIds.length > 0 && ` (${customIds.length})`}
          </button>
        ))}
      </div>

      {/* Freshness banner */}
      {showFreshnessBanner && (
        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2.5 text-sm">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="flex-1 text-muted-foreground">
            {t.ai.freshnessBanner(freshness!.hoursSince, freshness!.newSalesCount)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setDismissFreshness(true)}
          >
            {t.ai.useExisting}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setDismissFreshness(true)
              mutation.mutate()
            }}
            disabled={mutation.isPending}
          >
            {t.ai.runAnyway}
          </Button>
        </div>
      )}

      {/* Loading states */}
      {(isLoadingLatest || mutation.isPending) && <LoadingSpinner />}

      {/* Error */}
      {aiError && !mutation.isPending && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-sm text-destructive">{aiError}</p>
              {isNoApiKey && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="w-3.5 h-3.5" />
                  {t.ai.goToSettings}
                </Button>
              )}
              {!isNoApiKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                >
                  {t.ai.generate}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoadingLatest && !forecast && !mutation.isPending && !aiError && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Brain className="w-16 h-16 text-muted-foreground/20" />
          <p className="text-base font-medium">{t.ai.empty}</p>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {t.ai.generate}
          </Button>
        </div>
      )}

      {/* Results */}
      {forecast && !mutation.isPending && (
        <>
          {/* Summary card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>{t.ai.summary}</span>
                <div className="flex items-center gap-2">
                  {applyableItems.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-7 text-xs"
                      onClick={() => setApplyConfirmOpen(true)}
                      disabled={applyReorderMutation.isPending}
                      aria-label="套用建議補貨點"
                    >
                      <Target className="w-3.5 h-3.5" />
                      套用建議補貨點
                    </Button>
                  )}
                  <span className="text-xs font-normal">
                    {formatRelativeTime(forecast.generatedAt)}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm italic text-muted-foreground bg-muted/40 rounded-lg p-3">
                {forecast.summary}
              </p>
            </CardContent>
          </Card>

          {/* Confidence filter */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { key: 'all', label: t.ai.filterAll },
                  { key: 'high', label: t.ai.filterHighOnly },
                  { key: 'low', label: t.ai.filterLowOnly }
                ] as { key: ConfidenceFilter; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setConfidenceFilter(key)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full border transition-colors',
                    confidenceFilter === key
                      ? 'bg-primary/15 text-primary border-primary/30'
                      : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              顯示 {filteredItems.length} / {forecast.items.length} 項
            </span>
          </div>

          {/* Result table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm" aria-label={t.ai.title}>
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2.5 w-10">
                    <Checkbox
                      checked={allChecked}
                      data-indeterminate={indeterminate}
                      onCheckedChange={toggleSelectAll}
                      aria-label={t.ai.selectAll}
                    />
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium">{t.ai.colProduct}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{t.ai.colStock}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{t.ai.colDaysLeft}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{t.ai.colSuggestQty}</th>
                  {previous && (
                    <th className="text-right px-4 py-2.5 font-medium">{t.ai.colPrevSuggest}</th>
                  )}
                  <th className="text-center px-4 py-2.5 font-medium">{t.ai.colConfidence}</th>
                  <th className="text-left px-4 py-2.5 font-medium">{t.ai.colReasoning}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const urgentDays = item.days_remaining !== null && item.days_remaining < 7
                  const isCheckable = item.suggested_reorder_qty > 0
                  const isChecked = selectedIds.has(item.product_id)
                  const trend = getTrend(item)
                  const prevItem = previous?.items.find((p) => p.product_id === item.product_id)

                  return (
                    <tr
                      key={item.product_id}
                      className={cn(
                        'hover:bg-muted/30 transition-colors',
                        isChecked && 'bg-primary/5'
                      )}
                    >
                      <td className="px-3 py-3 text-center">
                        <Checkbox
                          checked={isChecked}
                          disabled={!isCheckable}
                          onCheckedChange={() => isCheckable && toggleRow(item.product_id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.stock_qty}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {item.days_remaining === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={cn(urgentDays && 'text-orange-500 font-medium')}>
                            {item.days_remaining}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {item.suggested_reorder_qty === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="font-medium">{item.suggested_reorder_qty}</span>
                        )}
                      </td>
                      {previous && (
                        <td className="px-4 py-3 text-right tabular-nums">
                          {!prevItem ? (
                            <span className="text-xs text-muted-foreground">{t.ai.newEntry}</span>
                          ) : trend ? (
                            <span className={cn('text-xs font-medium flex items-center justify-end gap-0.5', trend.className)}>
                              {trend.diff > 0 && <ChevronUp className="w-3 h-3" />}
                              {trend.diff < 0 && <ChevronDown className="w-3 h-3" />}
                              {trend.diff === 0 && <Minus className="w-3 h-3" />}
                              {trend.label}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            CONFIDENCE_BADGE[item.confidence] ?? CONFIDENCE_BADGE.medium
                          )}
                        >
                          {item.confidence === 'high'
                            ? t.ai.confidenceHigh
                            : item.confidence === 'low'
                              ? t.ai.confidenceLow
                              : t.ai.confidenceMedium}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs">
                        <span className="text-sm line-clamp-2">{item.reasoning}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      </>} {/* end forecast tab */}

      {/* ── Chat Tab (RAG) ───────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          {/* Description */}
          <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-4 py-3 text-sm text-muted-foreground">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
            <span>
              RAG 流程：你的問題 → <strong>Step 1 Retrieval</strong> 從資料庫撈取業務資料 →{' '}
              <strong>Step 2 Augmented</strong> 組成 prompt → <strong>Step 3 Generation</strong> Claude 回答
            </span>
          </div>

          {/* Suggested questions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">建議問題</span>
              <button
                onClick={() => setDisplayedQuestions(pickRandom(QUESTION_POOL, 4))}
                disabled={chatLoading}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                title="隨機換一批建議問題"
              >
                <Shuffle className="w-3 h-3" />
                Mock
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {displayedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleChatSend(q)}
                  disabled={chatLoading}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Message list */}
          <div className="space-y-3 min-h-[200px] max-h-[480px] overflow-y-auto pr-1">
            {chatMessages.length === 0 && !chatLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Bot className="w-12 h-12 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">點選建議問題或自行輸入，即可向 AI 詢問你的業務資料</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={cn('max-w-[82%] space-y-2', msg.role === 'user' ? 'items-end' : '')}>
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted/60 text-foreground rounded-tl-sm'
                    )}
                  >
                    {msg.role === 'user' ? (
                      <p className="leading-relaxed">{msg.content}</p>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="leading-relaxed mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          h1: ({ children }) => <p className="font-semibold text-base mb-1">{children}</p>,
                          h2: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                          h3: ({ children }) => <p className="font-medium mb-1">{children}</p>,
                          table: ({ children }) => (
                            <div className="overflow-x-auto mb-2">
                              <table className="text-xs border-collapse w-full">{children}</table>
                            </div>
                          ),
                          th: ({ children }) => <th className="border border-border px-2 py-1 bg-muted/40 font-medium text-left">{children}</th>,
                          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
                          code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                          hr: () => <hr className="border-border my-2" />
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  {/* RAG context accordion */}
                  {msg.role === 'assistant' && msg.context && (
                    <details className="group">
                      <summary className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none list-none">
                        <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                        查看本次使用的業務資料（Retrieval Context）
                      </summary>
                      <pre className="mt-2 text-xs bg-muted/40 border border-border rounded-lg p-3 whitespace-pre-wrap text-muted-foreground leading-relaxed overflow-x-auto">
                        {msg.context}
                      </pre>
                    </details>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center mt-0.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted/60 rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 items-end">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleChatSend(chatInput)
                }
              }}
              placeholder={'輸入問題，例如：本月哪個商品賣最好？\n（Enter 送出，Shift+Enter 換行）'}
              disabled={chatLoading}
              rows={2}
              className="flex-1 resize-none"
            />
            <Button
              onClick={() => handleChatSend(chatInput)}
              disabled={chatLoading || !chatInput.trim()}
              className="gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              送出
            </Button>
          </div>
        </div>
      )}

      {/* Batch purchase floating bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm font-medium">已選 {selectedIds.size} 項商品</span>
          <Button size="sm" className="gap-1.5" onClick={handleBatchPurchase}>
            <ShoppingCart className="w-3.5 h-3.5" />
            {t.ai.batchCreatePurchase(selectedIds.size)}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            取消選取
          </Button>
        </div>
      )}

      {/* ProductPickerDialog */}
      <ProductPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedIds={customIds}
        onConfirm={(ids) => {
          setCustomIds(ids)
          setScope('custom')
        }}
      />

      {/* Apply reorder points confirm dialog */}
      <ConfirmDialog
        open={applyConfirmOpen}
        onOpenChange={(o) => !o && setApplyConfirmOpen(false)}
        title="套用建議補貨點"
        description={`將根據 AI 預測更新 ${applyableItems.length} 項商品的補貨點（預測需求量的 50%），確認繼續？`}
        onConfirm={() => {
          setApplyConfirmOpen(false)
          handleApplyReorderPts()
        }}
        confirmLabel="確認套用"
        variant="default"
      />
    </div>
  )
}
