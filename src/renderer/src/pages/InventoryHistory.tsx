import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Download, History, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useToast } from '@/components/ui/use-toast'
import type { InventoryAdjustment } from '@/types/schema'
import { useLang } from '@/lib/useLang'

const DATE_PRESETS = [
  { label: '今天', days: 0 },
  { label: '本週', days: 7 },
  { label: '本月', days: 30, offsetMonth: 0 as number | undefined },
  { label: '上月', offsetMonth: -1 as number | undefined },
  { label: '近90天', days: 90 }
]

function calcPreset(days?: number, offsetMonth?: number): { from: string; to: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  if (offsetMonth === -1) {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const last = new Date(today.getFullYear(), today.getMonth(), 0)
    return { from: fmt(first), to: fmt(last) }
  }
  if (days === 0) return { from: fmt(today), to: fmt(today) }
  const from = new Date(today); from.setDate(from.getDate() - (days ?? 30))
  return { from: fmt(from), to: fmt(today) }
}

const REASONS = ['盤點修正', '損耗報廢', '樣品出貨', '退貨入庫', '系統校正', '其他']

function DeltaCell({ delta }: { delta: number }) {
  if (delta > 0) return <span className="text-green-400 font-semibold tabular-nums">+{delta}</span>
  return <span className="text-destructive font-semibold tabular-nums">{delta}</span>
}

type HistSortKey = 'adjusted_at' | 'product_name' | 'sku' | 'category' | 'delta' | 'reason'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3" />
  return dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
}

export default function InventoryHistory() {
  const { toast } = useToast()
  const t = useLang()
  const h = t.inventoryHistory
  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<HistSortKey>('adjusted_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: HistSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const hasDateFilter = dateFrom || dateTo

  const { data: records, isLoading } = useQuery<InventoryAdjustment[]>({
    queryKey: ['adjustments', 'all', search, reason, dateFrom, dateTo],
    queryFn: () =>
      window.electronAPI.products.getAllAdjustments({
        search: search || undefined,
        reason: reason || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      })
  })

  const sortedRecords = useMemo(() => {
    if (!records) return []
    return [...records].sort((a, b) => {
      const av: string | number = (a[sortKey] ?? '') as string | number
      const bv: string | number = (b[sortKey] ?? '') as string | number
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'asc' ? av - bv : bv - av
      const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [records, sortKey, sortDir])

  const handleExport = async () => {
    const result = await window.electronAPI.export.adjustments()
    if (result.success) {
      toast({ title: `已匯出至 ${result.filePath}`, variant: 'success' })
    } else {
      toast({ title: result.error ?? '匯出失敗', variant: 'destructive' })
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={h.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{h.allReasons}</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>{h.reasons[r as keyof typeof h.reasons] ?? r}</option>
          ))}
        </select>
        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {hasDateFilter && (
            <button
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-muted-foreground hover:text-foreground"
              title={h.clearDateFilter}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Date presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {DATE_PRESETS.map((preset) => {
            const { from, to } = calcPreset(preset.days, preset.offsetMonth)
            const active = dateFrom === from && dateTo === to
            return (
              <button
                key={preset.label}
                className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${active ? 'bg-primary/15 text-primary border-primary/30' : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground'}`}
                onClick={() => { setDateFrom(from); setDateTo(to) }}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2 ml-auto">
          <Download className="w-4 h-4" />
          {t.common.exportCsv}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner />
        ) : !records?.length ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <History className="w-10 h-10 opacity-30" />
            <p className="text-sm">{h.emptyMessage}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">庫存異動歷史記錄</caption>
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                {([
                  { key: 'adjusted_at' as HistSortKey, label: h.time, align: 'left' },
                  { key: 'product_name' as HistSortKey, label: t.products.title, align: 'left' },
                  { key: 'sku' as HistSortKey, label: 'SKU', align: 'left' },
                  { key: 'category' as HistSortKey, label: t.products.category, align: 'left' },
                  { key: 'delta' as HistSortKey, label: h.delta, align: 'right' },
                  { key: 'reason' as HistSortKey, label: h.reason, align: 'left' },
                ] as { key: HistSortKey; label: string; align: 'left' | 'right' }[]).map((col) => (
                  <th key={col.key} scope="col"
                    className={`px-4 py-3 font-medium ${col.key === 'delta' ? 'w-20' : ''} ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => handleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${col.align === 'right' ? 'flex-row-reverse' : ''}`}>
                      {col.label}
                      <span className="opacity-50" aria-hidden="true"><SortIcon active={sortKey === col.key} dir={sortDir} /></span>
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 text-left font-medium">{h.note}</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((rec) => (
                <tr key={rec.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {rec.adjusted_at.replace('T', ' ').slice(0, 16)}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{rec.product_name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{rec.sku}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{rec.category}</td>
                  <td className="px-4 py-2.5 text-right">
                    <DeltaCell delta={rec.delta} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {h.reasons[rec.reason as keyof typeof h.reasons] ?? rec.reason}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{rec.note ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {records && records.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {h.recordCount(records.length)}
        </p>
      )}
    </div>
  )
}
