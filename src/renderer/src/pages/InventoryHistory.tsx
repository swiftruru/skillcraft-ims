import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Download, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useToast } from '@/components/ui/use-toast'
import type { InventoryAdjustment } from '@/types/schema'
import { useLang } from '@/lib/useLang'

const REASONS = ['盤點修正', '損耗報廢', '樣品出貨', '退貨入庫', '系統校正', '其他']

function DeltaCell({ delta }: { delta: number }) {
  if (delta > 0) return <span className="text-green-400 font-semibold tabular-nums">+{delta}</span>
  return <span className="text-destructive font-semibold tabular-nums">{delta}</span>
}

export default function InventoryHistory() {
  const { toast } = useToast()
  const t = useLang()
  const h = t.inventoryHistory
  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')

  const { data: records, isLoading } = useQuery<InventoryAdjustment[]>({
    queryKey: ['adjustments', 'all', search, reason],
    queryFn: () =>
      window.electronAPI.products.getAllAdjustments({
        search: search || undefined,
        reason: reason || undefined
      })
  })

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
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
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
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{h.time}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.products.title}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground font-mono text-xs">SKU</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.products.category}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-20">{h.delta}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{h.reason}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{h.note}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
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
          {records.length} {t.common.noData === 'No data' ? 'records' : '筆記錄'}
        </p>
      )}
    </div>
  )
}
