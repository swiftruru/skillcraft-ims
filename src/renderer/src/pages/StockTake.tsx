import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowLeft, CheckCircle2, Trash2, ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
import type { StockTake, StockTakeDetail, StockTakeItem } from '@/types/schema'

// ── List view ────────────────────────────────────────────────────────────────

function ListView({ onSelect }: { onSelect: (id: number) => void }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: takes, isLoading } = useQuery<StockTake[]>({
    queryKey: ['stocktakes'],
    queryFn: () => window.electronAPI.stocktake.getAll()
  })

  const createMutation = useMutation({
    mutationFn: () => window.electronAPI.stocktake.create(),
    onSuccess: (take) => {
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] })
      toast({ title: `盤點單 ${take.take_no} 已建立`, variant: 'success' })
      onSelect(take.id)
    },
    onError: (e) => toast({ title: (e as Error).message, variant: 'destructive' })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.stocktake.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] })
      toast({ title: '盤點單已刪除', variant: 'success' })
    }
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">盤點紀錄</h2>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="gap-2">
          <Plus className="w-4 h-4" />
          新建盤點
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !takes?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
          <ClipboardCheck className="w-10 h-10 opacity-30" />
          <p className="text-sm">尚無盤點記錄，點擊「新建盤點」開始</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">盤點單號</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">狀態</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">建立日期</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">項目</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">差異</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">未盤</th>
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
                      <Badge variant="secondary" className="text-xs bg-blue-500/15 text-blue-400">草稿</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-green-500/15 text-green-400">已完成</Badge>
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
        title="刪除盤點單"
        description="刪除後無法復原。"
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
      toast({ title: `盤點完成，產生 ${result.adjustments} 筆庫存調整`, variant: 'success' })
      onBack()
    },
    onError: (e) => toast({ title: (e as Error).message, variant: 'destructive' })
  })

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{take.take_no}</span>
            {isDraft
              ? <Badge variant="secondary" className="text-xs bg-blue-500/15 text-blue-400">草稿</Badge>
              : <Badge variant="secondary" className="text-xs bg-green-500/15 text-green-400">已完成</Badge>
            }
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(take.created_at)}</p>
        </div>
        {isDraft && (
          <Button
            onClick={() => setConfirmComplete(true)}
            disabled={completeMutation.isPending}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            完成盤點
          </Button>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>已盤 <span className="font-semibold text-foreground">{counted}</span> / {take.items.length} 項</span>
        <span>差異 <span className={`font-semibold ${diffs > 0 ? 'text-yellow-400' : 'text-foreground'}`}>{diffs}</span> 項</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">商品名稱</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground font-mono text-xs">SKU</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">類別</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">系統庫存</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">實際數量</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-20">差異</th>
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
        title="完成盤點"
        description={`系統將對 ${diffs} 項有差異的商品自動調整庫存（寫入盤點修正記錄），此操作無法復原。`}
        confirmLabel="確認完成"
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
