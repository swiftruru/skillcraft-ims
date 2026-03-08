import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowLeft, CheckCircle2, Trash2, ClipboardCheck, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
import type { StockTake, StockTakeDetail, StockTakeItem } from '@/types/schema'
import { useLang } from '@/lib/useLang'

// ── List view ────────────────────────────────────────────────────────────────

function ListView({ onSelect }: { onSelect: (id: number) => void }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useLang()
  const s = t.stockTake
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: takes, isLoading } = useQuery<StockTake[]>({
    queryKey: ['stocktakes'],
    queryFn: () => window.electronAPI.stocktake.getAll()
  })

  const createMutation = useMutation({
    mutationFn: () => window.electronAPI.stocktake.create(),
    onSuccess: (take) => {
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] })
      toast({ title: s.created(take.take_no), variant: 'success' })
      onSelect(take.id)
    },
    onError: (e) => toast({ title: (e as Error).message, variant: 'destructive' })
  })

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
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">No.</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.common.status}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.common.date}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Items</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{s.difference}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Uncounted</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {takes.map((take) => (
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

function DetailView({ id, onBack }: { id: number; onBack: () => void }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useLang()
  const s = t.stockTake
  const [confirmComplete, setConfirmComplete] = useState(false)

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

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.products.title}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground font-mono text-xs">SKU</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.products.category}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">{s.systemQty}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">{s.countedQty}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-20">{s.difference}</th>
            </tr>
          </thead>
          <tbody>
            {take.items.map((item) => (
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
  const [selectedId, setSelectedId] = useState<number | null>(null)

  if (selectedId !== null) {
    return <DetailView id={selectedId} onBack={() => setSelectedId(null)} />
  }
  return <ListView onSelect={setSelectedId} />
}
