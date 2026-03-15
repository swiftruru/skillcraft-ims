import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowLeft, CheckCircle2, Trash2, ClipboardCheck, Wand2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
import type { StockTake, StockTakeDetail, StockTakeItem } from '@/types/schema'
import { useLang } from '@/lib/useLang'

// ── List view ────────────────────────────────────────────────────────────────

type ListSortKey = 'take_no' | 'status' | 'created_at' | 'item_count' | 'diff_count' | 'uncounted'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3" />
  return dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
}

function ListView({ onSelect, autoCreate }: { onSelect: (id: number) => void; autoCreate?: boolean }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useLang()
  const s = t.stockTake
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [sortKey, setSortKey] = useState<ListSortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: ListSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const { data: takes, isLoading } = useQuery<StockTake[]>({
    queryKey: ['stocktakes'],
    queryFn: () => window.electronAPI.stocktake.getAll()
  })

  const sortedTakes = useMemo(() => {
    if (!takes) return []
    return [...takes].sort((a, b) => {
      const av: string | number = (a[sortKey] ?? '') as string | number
      const bv: string | number = (b[sortKey] ?? '') as string | number
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'asc' ? av - bv : bv - av
      const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [takes, sortKey, sortDir])

  const createMutation = useMutation({
    mutationFn: () => window.electronAPI.stocktake.create(),
    onSuccess: (take) => {
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] })
      toast({ title: s.created(take.take_no), variant: 'success' })
      onSelect(take.id)
    },
    onError: (e) => toast({ title: (e as Error).message, variant: 'destructive' })
  })

  const autoCreated = useRef(false)
  useEffect(() => {
    if (autoCreate && !autoCreated.current) {
      autoCreated.current = true
      createMutation.mutate()
    }
  }, [])

  // N 鍵快速新建盤點
  useEffect(() => {
    const handler = () => createMutation.mutate()
    window.addEventListener('ims:new-item', handler)
    return () => window.removeEventListener('ims:new-item', handler)
  }, [])

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.stocktake.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] })
      toast({ title: s.deleted, variant: 'success' })
    }
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">{s.records}</h2>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="gap-2">
          <Plus className="w-4 h-4" />
          {s.newTake}
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !takes?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
          <ClipboardCheck className="w-10 h-10 opacity-30" />
          <p className="text-sm">{s.emptyMessage}</p>
        </div>
      ) : (
        <div data-tour="stocktake-chart" className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                {([
                  { key: 'take_no' as ListSortKey, label: 'No.', align: 'left' },
                  { key: 'status' as ListSortKey, label: t.common.status, align: 'left' },
                  { key: 'created_at' as ListSortKey, label: t.common.date, align: 'left' },
                  { key: 'item_count' as ListSortKey, label: 'Items', align: 'right' },
                  { key: 'diff_count' as ListSortKey, label: s.difference, align: 'right' },
                  { key: 'uncounted' as ListSortKey, label: 'Uncounted', align: 'right' },
                ] as { key: ListSortKey; label: string; align: 'left' | 'right' }[]).map((col) => (
                  <th key={col.key} scope="col" className={`px-4 py-3 font-medium ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => handleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${col.align === 'right' ? 'flex-row-reverse' : ''}`}>
                      {col.label}
                      <span className="opacity-50" aria-hidden="true"><SortIcon active={sortKey === col.key} dir={sortDir} /></span>
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {sortedTakes.map((take) => (
                <tr
                  key={take.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onSelect(take.id)}
                >
                  <td className="px-4 py-3 font-mono text-xs">{take.take_no}</td>
                  <td className="px-4 py-3">
                    {take.status === 'draft' ? (
                      <Badge variant="secondary" className="text-xs bg-blue-500/15 text-blue-400">{s.statusDraft}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-green-500/15 text-green-400">{s.statusCompleted}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(take.created_at)}</td>
                  <td className="px-4 py-3 text-right">{take.item_count ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    {(take.diff_count ?? 0) > 0
                      ? <span className="text-yellow-400 font-semibold">{take.diff_count}</span>
                      : <span className="text-muted-foreground">{take.diff_count ?? 0}</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{take.uncounted ?? 0}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {take.status === 'draft' && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(take.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={s.deleteTitle}
        description={s.deleteDesc}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  )
}

// ── Detail view ───────────────────────────────────────────────────────────────

function DiffCell({ item }: { item: StockTakeItem }) {
  if (item.counted_qty === null) return <span className="text-muted-foreground">-</span>
  const diff = item.counted_qty - item.system_qty
  if (diff === 0) return <span className="text-muted-foreground">0</span>
  if (diff > 0) return <span className="text-green-400 font-semibold">+{diff}</span>
  return <span className="text-destructive font-semibold">{diff}</span>
}

type DetailSortKey = 'product_name' | 'sku' | 'category' | 'system_qty' | 'counted_qty' | 'diff'

function DetailView({ id, onBack }: { id: number; onBack: () => void }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useLang()
  const s = t.stockTake
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [detailSortKey, setDetailSortKey] = useState<DetailSortKey>('product_name')
  const [detailSortDir, setDetailSortDir] = useState<SortDir>('asc')

  const handleDetailSort = (key: DetailSortKey) => {
    if (detailSortKey === key) setDetailSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setDetailSortKey(key); setDetailSortDir('asc') }
  }

  const { data: take, isLoading } = useQuery<StockTakeDetail>({
    queryKey: ['stocktakes', id],
    queryFn: () => window.electronAPI.stocktake.getById(id) as Promise<StockTakeDetail>
  })

  const updateMutation = useMutation({
    mutationFn: ({ itemId, val }: { itemId: number; val: number | null }) =>
      window.electronAPI.stocktake.updateItem(itemId, val),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stocktakes', id] })
  })

  const completeMutation = useMutation({
    mutationFn: () => window.electronAPI.stocktake.complete(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({ title: `${s.completedMsg}，${result.adjustments} adjustments`, variant: 'success' })
      onBack()
    },
    onError: (e) => toast({ title: (e as Error).message, variant: 'destructive' })
  })

  const handleMockFill = async () => {
    const uncounted = take?.items.filter((i) => i.counted_qty === null) ?? []
    if (!uncounted.length) return
    await Promise.all(uncounted.map((i) => window.electronAPI.stocktake.updateItem(i.id, i.system_qty)))
    queryClient.invalidateQueries({ queryKey: ['stocktakes', id] })
    toast({ title: `已填入 ${uncounted.length} 項（與系統庫存相符）`, variant: 'success' })
  }

  const handleInput = useCallback((item: StockTakeItem, raw: string) => {
    const val = raw === '' ? null : parseInt(raw)
    if (val !== null && (isNaN(val) || val < 0)) return
    updateMutation.mutate({ itemId: item.id, val })
  }, [updateMutation])

  if (isLoading || !take) return <LoadingSpinner />

  const counted = take.items.filter((i) => i.counted_qty !== null).length
  const diffs = take.items.filter((i) => i.counted_qty !== null && i.counted_qty !== i.system_qty).length
  const isDraft = take.status === 'draft'

  const sortedItems = useMemo(() => {
    return [...take.items].sort((a, b) => {
      let av: string | number
      let bv: string | number
      if (detailSortKey === 'diff') {
        av = a.counted_qty !== null ? a.counted_qty - a.system_qty : -Infinity
        bv = b.counted_qty !== null ? b.counted_qty - b.system_qty : -Infinity
      } else if (detailSortKey === 'counted_qty') {
        av = a.counted_qty ?? -Infinity
        bv = b.counted_qty ?? -Infinity
      } else {
        av = (a[detailSortKey] ?? '') as string | number
        bv = (b[detailSortKey] ?? '') as string | number
      }
      if (typeof av === 'number' && typeof bv === 'number')
        return detailSortDir === 'asc' ? av - bv : bv - av
      const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0
      return detailSortDir === 'asc' ? cmp : -cmp
    })
  }, [take.items, detailSortKey, detailSortDir])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{take.take_no}</span>
            {isDraft
              ? <Badge variant="secondary" className="text-xs bg-blue-500/15 text-blue-400">{s.statusDraft}</Badge>
              : <Badge variant="secondary" className="text-xs bg-green-500/15 text-green-400">{s.statusCompleted}</Badge>
            }
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(take.created_at)}</p>
        </div>
        {isDraft && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleMockFill} className="gap-2 text-muted-foreground">
              <Wand2 className="w-4 h-4" />
              {s.mockFill}
            </Button>
            <Button onClick={() => setConfirmComplete(true)} disabled={completeMutation.isPending} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {s.complete}
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{counted} / {take.items.length} {s.countedQty}</span>
        <span>{s.difference}: <span className={`font-semibold ${diffs > 0 ? 'text-yellow-400' : 'text-foreground'}`}>{diffs}</span></span>
      </div>

      {/* Variance Chart for completed stocktakes */}
      {!isDraft && (() => {
        const diffItems = take.items.filter(
          (i) => i.counted_qty !== null && i.counted_qty !== i.system_qty
        )
        if (!diffItems.length) return null
        const chartData = diffItems.map((i) => ({
          name: i.product_name.length > 10 ? i.product_name.slice(0, 10) + '…' : i.product_name,
          帳面數量: i.system_qty,
          實際盤點: i.counted_qty
        }))
        const chartHeight = Math.min(400, Math.max(200, diffItems.length * 44))
        return (
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">差異分析（{diffItems.length} 項有差異）</p>
            <div role="img" aria-label="盤點差異橫向直條圖：帳面數量與實際盤點對比">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart layout="vertical" data={chartData} margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="帳面數量" fill="#3b82f6" radius={[0, 3, 3, 0]} maxBarSize={16} />
                  <Bar dataKey="實際盤點" fill="#10b981" radius={[0, 3, 3, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
              <p className="sr-only">橫向直條圖對比每項有差異商品的帳面數量（藍色）與實際盤點數量（綠色）。</p>
            </div>
          </div>
        )
      })()}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              {([
                { key: 'product_name' as DetailSortKey, label: t.products.title, align: 'left' },
                { key: 'sku' as DetailSortKey, label: 'SKU', align: 'left' },
                { key: 'category' as DetailSortKey, label: t.products.category, align: 'left' },
                { key: 'system_qty' as DetailSortKey, label: s.systemQty, align: 'right' },
                { key: 'counted_qty' as DetailSortKey, label: s.countedQty, align: 'right' },
                { key: 'diff' as DetailSortKey, label: s.difference, align: 'right' },
              ] as { key: DetailSortKey; label: string; align: 'left' | 'right' }[]).map((col) => (
                <th key={col.key} scope="col"
                  className={`px-4 py-3 font-medium ${col.key === 'system_qty' ? 'w-24' : col.key === 'counted_qty' ? 'w-28' : col.key === 'diff' ? 'w-20' : ''} ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  aria-sort={detailSortKey === col.key ? (detailSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => handleDetailSort(col.key)}
                    className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${col.align === 'right' ? 'flex-row-reverse' : ''}`}>
                    {col.label}
                    <span className="opacity-50" aria-hidden="true"><SortIcon active={detailSortKey === col.key} dir={detailSortDir} /></span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2">{item.product_name}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{item.sku}</td>
                <td className="px-4 py-2 text-muted-foreground text-xs">{item.category}</td>
                <td className="px-4 py-2 text-right">{item.system_qty} {item.unit}</td>
                <td className="px-4 py-2 text-right">
                  {isDraft ? (
                    <input
                      key={item.counted_qty ?? 'null'}
                      type="number"
                      min={0}
                      defaultValue={item.counted_qty ?? ''}
                      placeholder="-"
                      onBlur={(e) => handleInput(item, e.target.value)}
                      className="w-20 text-right bg-transparent border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <span>{item.counted_qty ?? '-'} {item.counted_qty !== null ? item.unit : ''}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <DiffCell item={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmComplete}
        onOpenChange={setConfirmComplete}
        title={s.completeTitle}
        description={s.completeDesc}
        confirmLabel={s.complete}
        variant="default"
        onConfirm={() => completeMutation.mutate()}
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StockTakePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const autoCreate = !!(location.state as { createNew?: boolean } | null)?.createNew

  useEffect(() => {
    if (autoCreate) navigate(location.pathname, { replace: true, state: null })
  }, [])

  if (selectedId !== null) {
    return <DetailView id={selectedId} onBack={() => setSelectedId(null)} />
  }
  return <ListView onSelect={setSelectedId} autoCreate={autoCreate} />
}
