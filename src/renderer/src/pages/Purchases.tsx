import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, CheckCircle, XCircle, Trash2, Printer, Download, Undo2, Copy, BadgeCheck, ShoppingCart, AlignJustify, List, LayoutList, MessageSquare, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type Column, type ContextMenuItem } from '@/components/common/DataTable'
import { SearchWithHistory } from '@/components/common/SearchWithHistory'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { TableSkeleton } from '@/components/common/TableSkeleton'
import { PurchaseForm } from '@/components/purchases/PurchaseForm'
import { PurchaseDetail } from '@/components/purchases/PurchaseDetail'
import { ReceivePurchaseDialog } from '@/components/purchases/ReceivePurchaseDialog'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { PurchaseOrder } from '@/types/schema'
import { useLang } from '@/lib/useLang'
import { useDemoStore } from '@/stores/demo.store'
import { EmptyState } from '@/components/common/EmptyState'
import { SavedFilters } from '@/components/common/SavedFilters'
import { useToast } from '@/components/ui/use-toast'

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
  const from = new Date(today)
  from.setDate(today.getDate() - (days ?? 30))
  return { from: fmt(from), to: fmt(today) }
}

export default function Purchases() {
  const queryClient = useQueryClient()
  const t = useLang()
  const p = t.purchases
  const { toast } = useToast()
  const spotlight = useDemoStore((s) => s.spotlight)
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const dateFrom = searchParams.get('from') ?? ''
  const dateTo = searchParams.get('to') ?? ''

  const setSearch = (v: string) => setSearchParams((prev) => { const n = new URLSearchParams(prev); if (v) n.set('q', v); else n.delete('q'); return n }, { replace: true })
  const setDateFrom = (v: string) => setSearchParams((prev) => { const n = new URLSearchParams(prev); if (v) n.set('from', v); else n.delete('from'); return n }, { replace: true })
  const setDateTo = (v: string) => setSearchParams((prev) => { const n = new URLSearchParams(prev); if (v) n.set('to', v); else n.delete('to'); return n }, { replace: true })

  const [formOpen, setFormOpen] = useState(false)
  const [density, setDensity] = useState<'compact' | 'normal' | 'relaxed'>(() =>
    (localStorage.getItem('ims-dt-density-purchases') as 'compact' | 'normal' | 'relaxed') ?? 'normal'
  )

  useEffect(() => {
    if ((location.state as { openForm?: boolean } | null)?.openForm) {
      setFormOpen(true)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [])

  useEffect(() => {
    const handler = () => setFormOpen(true)
    window.addEventListener('ims:new-item', handler)
    return () => window.removeEventListener('ims:new-item', handler)
  }, [])

  const [detailId, setDetailId] = useState<number | null>(null)
  const [receiveId, setReceiveId] = useState<number | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [returnId, setReturnId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [cloneData, setCloneData] = useState<Record<string, unknown> | null>(null)
  const [markPaidId, setMarkPaidId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [notePopover, setNotePopover] = useState<{ id: number; notes: string } | null>(null)

  const { data: orders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchases', 'all', search, dateFrom, dateTo],
    queryFn: () => window.electronAPI.purchases.getAll({
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    })
  })

  const receiveMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.purchases.receive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    }
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.purchases.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] })
  })

  const returnMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.purchases.return(id),
    onSuccess: (result) => {
      if ((result as { success: boolean }).success) {
        queryClient.invalidateQueries({ queryKey: ['purchases'] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['reports'] })
        queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      } else {
        setError(result.error ?? p.returnFailed)
      }
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.purchases.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] })
  })

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.purchases.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    }
  })

  const batchReceiveMutation = useMutation({
    mutationFn: (ids: number[]) => window.electronAPI.purchases.batchReceive(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setSelectedIds(new Set())
    }
  })

  const batchCancelMutation = useMutation({
    mutationFn: (ids: number[]) => window.electronAPI.purchases.batchCancel(ids),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      setSelectedIds(new Set())
      toast({ title: `批次取消：${res.cancelled} 筆成功，${res.skipped} 筆跳過`, variant: 'success' })
    }
  })

  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      window.electronAPI.purchases.updateNotes(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      setNotePopover(null)
      toast({ title: '備註已儲存', variant: 'success' })
    }
  })

  const allIds = (orders ?? []).map((o) => o.id as number)
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))
  const toggleAll = () => { allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(allIds)) }
  const toggleOne = (id: number) => setSelectedIds((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleClone = async (id: number) => {
    const order = await window.electronAPI.purchases.getById(id)
    if (order) {
      setCloneData({
        supplier_id: order.supplier_id,
        notes: order.notes ?? '',
        items: (order.items ?? []).map((i) => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price }))
      })
      setFormOpen(true)
    }
  }

  const columns: Column<PurchaseOrder>[] = [
    {
      key: '__check__' as keyof PurchaseOrder,
      label: '',
      className: 'w-10',
      render: (_v, row) => (
        <Checkbox checked={selectedIds.has(row.id as number)} onCheckedChange={() => toggleOne(row.id as number)} onClick={(e) => e.stopPropagation()} />
      ),
      header: () => <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
    },
    { key: 'order_no', label: p.orderNo, sortable: true, className: 'font-mono text-xs w-36' },
    { key: 'supplier_name', label: p.supplier, sortable: true },
    { key: 'order_date', label: p.orderDate, sortable: true, render: (v) => formatDate(String(v)) },
    {
      key: 'status',
      label: t.common.status,
      sortable: true,
      render: (v, row) => {
        const isOverdue = v === 'pending' &&
          Math.floor((Date.now() - new Date(String(row.created_at)).getTime()) / 86400000) > 30
        return (
          <div className="flex items-center gap-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(String(v))}`}>
              {getStatusLabel(String(v))}
            </span>
            {isOverdue && (
              <span data-tour="overdue-badge" className="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400">{p.overdue}</span>
            )}
          </div>
        )
      }
    },
    {
      key: 'payment_status',
      label: p.paymentStatus,
      hideable: true,
      render: (_v, row) => {
        if (row.status !== 'received') return null
        const isOverdue = row.payment_status === 'unpaid' && row.payment_due_date && row.payment_due_date < new Date().toISOString().slice(0, 10)
        if (row.payment_status === 'paid') {
          return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">{p.paid}</span>
        }
        if (isOverdue) {
          return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{p.overdue}</span>
        }
        return <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p.unpaid}</span>
      }
    },
    {
      key: 'total_amount',
      label: t.common.amount,
      sortable: true,
      className: 'text-right w-28',
      render: (v) => formatCurrency(Number(v))
    },
    {
      key: 'id',
      label: '',
      className: 'w-36 text-right',
      render: (_v, row) => (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
          <Popover
            open={notePopover?.id === (row.id as number)}
            onOpenChange={(open) => { if (!open) setNotePopover(null) }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost" size="icon"
                className={`h-7 w-7 ${row.notes ? 'text-primary' : 'text-muted-foreground'}`}
                title="快速備註"
                onClick={(e) => { e.stopPropagation(); setNotePopover({ id: row.id as number, notes: String(row.notes ?? '') }) }}
              >
                <MessageSquare className={`w-3.5 h-3.5 ${row.notes ? 'fill-current' : ''}`} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-medium mb-2">快速備註</p>
              <Textarea
                rows={3}
                className="text-xs resize-none"
                placeholder="新增備註..."
                value={notePopover?.id === (row.id as number) ? notePopover.notes : ''}
                onChange={(e) => setNotePopover((prev) => prev ? { ...prev, notes: e.target.value } : null)}
              />
              <Button
                size="sm"
                className="mt-2 w-full h-7 text-xs"
                disabled={updateNotesMutation.isPending}
                onClick={() => notePopover && updateNotesMutation.mutate({ id: notePopover.id, notes: notePopover.notes })}
              >
                儲存
              </Button>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailId(row.id)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            data-tour="order-clone"
            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title={p.cloneOrder}
            onClick={() => handleClone(row.id as number)}
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
            title={t.common.exportPdf}
            onClick={() => window.electronAPI.print.pdf({ type: 'purchase', id: row.id as number })}
          >
            <Printer className="w-3.5 h-3.5" />
          </Button>
          {row.status === 'received' && row.payment_status !== 'paid' && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-green-400 hover:text-green-500"
              title={p.markPaid}
              onClick={() => setMarkPaidId(row.id as number)}
            >
              <BadgeCheck className="w-3.5 h-3.5" />
            </Button>
          )}
          {row.status === 'received' && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-orange-400 hover:text-orange-500"
              title={p.returnOrder}
              onClick={() => setReturnId(row.id)}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {row.status === 'pending' && (
            <>
              {spotlight?.type === 'purchase' && spotlight.id === row.id ? (
                <span className="relative inline-flex items-center justify-center">
                  <span className="absolute inset-0 rounded-md ring-2 ring-green-400 animate-ping opacity-75" />
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-green-400 ring-2 ring-green-400 ring-offset-1 ring-offset-background bg-green-400/15"
                    onClick={() => setReceiveId(row.id)} title={p.receiveTitle}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </Button>
                </span>
              ) : (
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-green-400"
                  onClick={() => setReceiveId(row.id)} title={p.receiveTitle}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-yellow-400"
                onClick={() => setCancelId(row.id)} title={p.cancelTitle}
              >
                <XCircle className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                onClick={() => setDeleteId(row.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
          <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => setError(null)}>
            ×
          </Button>
        </div>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchWithHistory
          className="flex-1 max-w-sm"
          placeholder={p.searchPlaceholder}
          value={search}
          onChange={setSearch}
          storageKey="ims-recent-search-purchases"
        />
        <Input data-tour="date-filter" type="date" className="h-9 w-36 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title={p.dateFrom} />
        <Input type="date" className="h-9 w-36 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title={p.dateTo} />
        {(dateFrom || dateTo) && (
          <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('from'); n.delete('to'); return n }, { replace: true })}>{p.clearDates}</button>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {DATE_PRESETS.map((preset) => {
          const { from, to } = calcPreset(preset.days, preset.offsetMonth)
          const active = dateFrom === from && dateTo === to
          return (
            <button
              key={preset.label}
              className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${active ? 'bg-primary/15 text-primary border-primary/30' : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground'}`}
              onClick={() => {
                if (active) {
                  setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('from'); n.delete('to'); return n }, { replace: true })
                } else {
                  setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('from', from); n.set('to', to); return n }, { replace: true })
                }
              }}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
      <SavedFilters
        storageKey="purchases"
        currentFilters={{ search, dateFrom, dateTo }}
        saveLabel={p.saveFilter}
        onApply={(filters) => setSearchParams(() => {
          const n = new URLSearchParams()
          if (filters.search) n.set('q', filters.search)
          if (filters.dateFrom) n.set('from', filters.dateFrom)
          if (filters.dateTo) n.set('to', filters.dateTo)
          return n
        }, { replace: true })}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline" className="gap-2" disabled={exporting}
          onClick={async () => { setExporting(true); await window.electronAPI.export.purchases(); setExporting(false) }}
        >
          <Download className="w-4 h-4" />
          {exporting ? t.common.exporting : t.common.exportCsv}
        </Button>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {p.addOrder}
        </Button>
        <div className="flex items-center rounded-md border border-border overflow-hidden ml-auto">
          {(['compact', 'normal', 'relaxed'] as const).map((d, i) => {
            const Icon = [AlignJustify, List, LayoutList][i]
            return (
              <button key={d} title={d} className={`h-9 px-2.5 transition-colors ${density === d ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => { setDensity(d); localStorage.setItem('ims-dt-density-purchases', d) }}>
                <Icon className="w-4 h-4" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <DataTable
            data={(orders ?? []) as unknown as Record<string, unknown>[]}
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            keyField="id"
            storageKey="purchases"
            onRowFocus={(row) => setDetailId(row.id as number)}
            density={density}
            contextMenu={(row) => {
              const order = row as unknown as PurchaseOrder
              const items: ContextMenuItem[] = [
                { label: t.common.view, icon: Eye as LucideIcon, onClick: () => setDetailId(order.id as number) },
                { label: p.cloneOrder, icon: Copy as LucideIcon, onClick: () => handleClone(order.id as number) },
              ]
              if (order.status === 'pending') {
                items.push({ label: p.receiveTitle, icon: CheckCircle as LucideIcon, onClick: () => setReceiveId(order.id as number) })
                items.push({ label: p.cancelTitle, icon: XCircle as LucideIcon, onClick: () => setCancelId(order.id as number) })
                items.push({ label: p.deleteTitle, icon: Trash2 as LucideIcon, variant: 'destructive', separator: true, onClick: () => setDeleteId(order.id as number) })
              }
              if (order.status === 'received' && order.payment_status !== 'paid') {
                items.push({ label: p.markPaid, icon: BadgeCheck as LucideIcon, onClick: () => setMarkPaidId(order.id as number) })
              }
              return items
            }}
            emptyMessage={p.emptyMessage}
            emptyState={!search && !dateFrom && !dateTo ? (
              <EmptyState
                icon={ShoppingCart}
                title={p.emptyTitle}
                description={p.emptyDesc}
                action={{ label: p.emptyAction, onClick: () => setFormOpen(true) }}
              />
            ) : undefined}
          />
        )}
      </div>

      <PurchaseForm open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setCloneData(null) }} initialData={cloneData ?? undefined} />
      {detailId !== null && (
        <PurchaseDetail id={detailId} open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)} />
      )}
      <ReceivePurchaseDialog
        orderId={receiveId}
        open={receiveId !== null}
        onOpenChange={(open) => !open && setReceiveId(null)}
        onConfirm={(id) => receiveMutation.mutate(id)}
      />
      <ConfirmDialog
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
        title={p.cancelTitle}
        description={p.cancelDesc}
        onConfirm={() => cancelId && cancelMutation.mutate(cancelId)}
        confirmLabel={p.cancelTitle}
      />
      <ConfirmDialog
        open={returnId !== null}
        onOpenChange={(open) => !open && setReturnId(null)}
        title={p.returnTitle}
        description={p.returnDesc}
        onConfirm={() => returnId && returnMutation.mutate(returnId)}
        confirmLabel={p.returnConfirm}
      />
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={p.deleteTitle}
        description={p.deleteDesc}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
      <ConfirmDialog
        open={markPaidId !== null}
        onOpenChange={(open) => !open && setMarkPaidId(null)}
        title={p.markPaidTitle}
        description={p.markPaidDesc}
        onConfirm={() => markPaidId && markPaidMutation.mutate(markPaidId)}
        confirmLabel={p.markPaid}
        variant="default"
      />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">已選 {selectedIds.size} 筆</span>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-green-400 border-green-400/30 hover:text-green-400"
            onClick={() => batchReceiveMutation.mutate(Array.from(selectedIds))}
            disabled={batchReceiveMutation.isPending}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {p.batchMarkReceived ?? '批次標記收貨'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-red-400 border-red-400/30 hover:text-red-400"
            onClick={() => batchCancelMutation.mutate(Array.from(selectedIds))}
            disabled={batchCancelMutation.isPending}
          >
            <XCircle className="w-3.5 h-3.5" />
            批次取消
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedIds(new Set())}>
            {t.common.cancel}
          </Button>
        </div>
      )}
    </div>
  )
}
