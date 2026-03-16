import { useState, useEffect, useMemo } from 'react'
import { useFocusReturn } from '@/lib/useFocusReturn'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, CheckCircle, XCircle, Trash2, Printer, Download, Undo2, Copy, BadgeCheck, SplitSquareVertical, Receipt, AlignJustify, List, LayoutList, MessageSquare, FileDown, Clock, Circle, AlertTriangle as AlertTriangleIcon, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type Column, type ContextMenuItem } from '@/components/common/DataTable'
import { SearchWithHistory } from '@/components/common/SearchWithHistory'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { TableSkeleton } from '@/components/common/TableSkeleton'
import { SaleForm } from '@/components/sales/SaleForm'
import { SaleDetail } from '@/components/sales/SaleDetail'
import { PartialReturnDialog } from '@/components/sales/PartialReturnDialog'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import { CopyButton } from '@/components/ui/CopyButton'
import { HoverCard } from '@/components/ui/HoverCard'
import type { SalesOrder, Customer, Product } from '@/types/schema'
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

function SaleExpandedRow({ orderId }: { orderId: number }) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['sales', 'items', orderId],
    queryFn: () => window.electronAPI.sales.getById(orderId),
    staleTime: 1000 * 60
  })
  if (isLoading) return <div className="text-xs text-muted-foreground py-1">載入中...</div>
  if (!order?.items?.length) return <div className="text-xs text-muted-foreground py-1">無明細資料</div>
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-muted-foreground border-b border-border/50">
          <th className="text-left pb-1.5 pr-4 font-medium">商品名稱</th>
          <th className="text-left pb-1.5 pr-4 font-medium">SKU</th>
          <th className="text-right pb-1.5 pr-4 font-medium">數量</th>
          <th className="text-right pb-1.5 pr-4 font-medium">單價</th>
          <th className="text-right pb-1.5 font-medium">小計</th>
        </tr>
      </thead>
      <tbody>
        {order.items.map((item) => (
          <tr key={item.id} className="border-b border-border/20 last:border-0">
            <td className="py-1 pr-4">{item.product_name}</td>
            <td className="py-1 pr-4 text-muted-foreground">{item.product_sku}</td>
            <td className="py-1 pr-4 text-right">{item.quantity}</td>
            <td className="py-1 pr-4 text-right">{formatCurrency(item.unit_price)}</td>
            <td className="py-1 text-right font-medium">{formatCurrency(item.quantity * item.unit_price)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function Sales() {
  const queryClient = useQueryClient()
  const t = useLang()
  const s = t.sales
  const { toast } = useToast()
  const spotlight = useDemoStore((st) => st.spotlight)
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const dateFrom = searchParams.get('from') ?? ''
  const dateTo = searchParams.get('to') ?? ''
  const statusFilter = searchParams.get('status') ?? ''

  const setSearch = (v: string) => setSearchParams((prev) => { const n = new URLSearchParams(prev); if (v) n.set('q', v); else n.delete('q'); return n }, { replace: true })
  const setDateFrom = (v: string) => setSearchParams((prev) => { const n = new URLSearchParams(prev); if (v) n.set('from', v); else n.delete('from'); return n }, { replace: true })
  const setDateTo = (v: string) => setSearchParams((prev) => { const n = new URLSearchParams(prev); if (v) n.set('to', v); else n.delete('to'); return n }, { replace: true })
  const setStatusFilter = (v: string) => setSearchParams((prev) => { const n = new URLSearchParams(prev); if (v) n.set('status', v); else n.delete('status'); return n }, { replace: true })

  const [formOpen, setFormOpen] = useState(false)
  const { capture: captureFormFocus, restore: restoreFormFocus } = useFocusReturn()
  const [density, setDensity] = useState<'compact' | 'normal' | 'relaxed'>(() =>
    (localStorage.getItem('ims-dt-density-sales') as 'compact' | 'normal' | 'relaxed') ?? 'normal'
  )

  // Rule 74: Shortcut hint
  const [btnHintVisible, setBtnHintVisible] = useState(() => !localStorage.getItem('ims-hint-shown-sales'))
  const [dtHintVisible, setDtHintVisible] = useState(() => !localStorage.getItem('ims-hint-dt-shown'))
  useEffect(() => {
    if (!btnHintVisible) return
    const timer = setTimeout(() => { setBtnHintVisible(false); localStorage.setItem('ims-hint-shown-sales', '1') }, 5000)
    return () => clearTimeout(timer)
  }, [btnHintVisible])
  useEffect(() => {
    if (!dtHintVisible) return
    const timer = setTimeout(() => { setDtHintVisible(false); localStorage.setItem('ims-hint-dt-shown', '1') }, 5000)
    return () => clearTimeout(timer)
  }, [dtHintVisible])

  useEffect(() => {
    const state = location.state as { openForm?: boolean } | null
    if (state?.openForm) {
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
  const [completeId, setCompleteId] = useState<number | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [returnId, setReturnId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [cloneData, setCloneData] = useState<Record<string, unknown> | null>(null)
  const [markPaidId, setMarkPaidId] = useState<number | null>(null)
  const [partialReturnOrder, setPartialReturnOrder] = useState<SalesOrder | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [notePopover, setNotePopover] = useState<{ id: number; notes: string } | null>(null)

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers', 'all'],
    queryFn: () => window.electronAPI.customers.getAll(),
    staleTime: 1000 * 60 * 5
  })

  const { data: orders, isLoading } = useQuery<SalesOrder[]>({
    queryKey: ['sales', 'all', search, dateFrom, dateTo, statusFilter],
    queryFn: () => window.electronAPI.sales.getAll({
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: statusFilter || undefined
    })
  })

  // Rule 116: Status icon helper
  const getStatusIcon = (status: string) => {
    const cls = 'w-3 h-3 shrink-0'
    if (status === 'pending') return <Clock className={cls} aria-hidden="true" />
    if (status === 'completed') return <CheckCircle className={cls} aria-hidden="true" />
    if (status === 'cancelled') return <XCircle className={cls} aria-hidden="true" />
    return null
  }

  // Rule 72: Summary Strip
  const summary = useMemo(() => {
    const list = orders ?? []
    const completedCount = list.filter((o) => o.status === 'completed').length
    const pendingCount = list.filter((o) => o.status === 'pending').length
    const totalAmount = list.reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
    return { count: list.length, completedCount, pendingCount, totalAmount }
  }, [orders])

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      const order = await window.electronAPI.sales.getById(id)
      const result = await window.electronAPI.sales.complete(id)
      return { result, saleItems: (order?.items ?? []) as Array<{ product_id: number; quantity: number }> }
    },
    onSuccess: ({ result, saleItems }) => {
      if ((result as { success: boolean }).success) {
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['reports'] })

        // Rule 70: Post-sale low stock alert
        const cachedProds = queryClient.getQueriesData<Product[]>({ queryKey: ['products', 'all'] })
        const products = cachedProds.flatMap(([, data]) => data ?? [])
        const lowStockProds = saleItems
          .map((item) => {
            const prod = products.find((p) => p.id === item.product_id)
            if (!prod) return null
            const newStock = prod.stock_qty - item.quantity
            return newStock <= prod.reorder_pt ? { ...prod, stock_qty: newStock } : null
          })
          .filter((p): p is Product => p !== null)

        if (lowStockProds.length > 0) {
          toast({
            title: `${lowStockProds.length} 項商品庫存低於補貨點`,
            action: {
              label: '建立採購單',
              onClick: () => navigate('/purchases', {
                state: {
                  openForm: true,
                  items: lowStockProds.map((prod) => ({
                    product_id: prod.id,
                    quantity: Math.max(1, prod.reorder_pt - prod.stock_qty + 1),
                    unit_price: prod.buy_price
                  }))
                }
              })
            }
          })
        }
      } else {
        setError((result as { error?: string }).error ?? s.opFailed)
      }
    }
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.sales.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales'] })
  })

  const returnMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.sales.return(id),
    onSuccess: (result) => {
      if ((result as { success: boolean }).success) {
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['reports'] })
        queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      } else {
        setError(result.error ?? s.returnFailed)
      }
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.sales.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales'] })
  })

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.sales.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    }
  })

  const batchMarkPaidMutation = useMutation({
    mutationFn: (ids: number[]) => window.electronAPI.sales.batchMarkPaid(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setSelectedIds(new Set())
    }
  })

  const batchCompleteMutation = useMutation({
    mutationFn: (ids: number[]) => window.electronAPI.sales.batchComplete(ids),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setSelectedIds(new Set())
      toast({ title: `批次完成：${res.completed} 筆成功，${res.skipped} 筆跳過`, variant: 'success' })
    }
  })

  const batchCancelMutation = useMutation({
    mutationFn: (ids: number[]) => window.electronAPI.sales.batchCancel(ids),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      setSelectedIds(new Set())
      toast({ title: `批次取消：${res.cancelled} 筆成功，${res.skipped} 筆跳過`, variant: 'success' })
    }
  })

  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      window.electronAPI.sales.updateNotes(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
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
    const order = await window.electronAPI.sales.getById(id)
    if (order) {
      setCloneData({
        customer_id: order.customer_id,
        notes: order.notes ?? '',
        items: (order.items ?? []).map((i) => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price }))
      })
      setFormOpen(true)
    }
  }

  const columns: Column<SalesOrder>[] = [
    {
      key: '__check__' as keyof SalesOrder,
      label: '',
      className: 'w-10',
      render: (_v, row) => (
        <Checkbox checked={selectedIds.has(row.id as number)} onCheckedChange={() => toggleOne(row.id as number)} onClick={(e) => e.stopPropagation()} />
      ),
      header: () => <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
    },
    { key: 'order_no', label: s.orderNo, sortable: true, className: 'font-mono text-xs w-36', render: (v) => (
      <div className="group flex items-center gap-1">
        <span>{String(v)}</span>
        <CopyButton value={String(v)} />
      </div>
    )},
    { key: 'customer_name', label: s.customer, sortable: true, render: (v, row) => {
      const order = row as unknown as SalesOrder
      const customer = (customers ?? []).find((c) => c.id === order.customer_id)
      if (!customer || !String(v)) return <span>{String(v ?? '—')}</span>
      return (
        <HoverCard trigger={<span className="cursor-default">{String(v)}</span>}>
          <div className="space-y-1 text-xs">
            <p className="font-medium text-sm">{customer.name}</p>
            {customer.contact && <p className="text-muted-foreground">{customer.contact}</p>}
            {customer.phone && (
              <div className="group flex items-center gap-1">
                <span>{customer.phone}</span>
                <CopyButton value={customer.phone} />
              </div>
            )}
            {customer.email && (
              <div className="group flex items-center gap-1">
                <span className="truncate max-w-[160px]">{customer.email}</span>
                <CopyButton value={customer.email} />
              </div>
            )}
          </div>
        </HoverCard>
      )
    }},
    { key: 'order_date', label: s.orderDate, sortable: true, render: (v) => formatDate(String(v)) },
    {
      key: 'status',
      label: t.common.status,
      sortable: true,
      render: (v) => {
        const active = statusFilter === String(v)
        return (
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full cursor-pointer transition-opacity hover:opacity-80 ${getStatusColor(String(v))} ${active ? 'ring-1 ring-current' : ''}`}
            onClick={(e) => { e.stopPropagation(); setStatusFilter(active ? '' : String(v)) }}
            title={active ? '點擊取消篩選' : `篩選：${getStatusLabel(String(v))}`}
          >
            {getStatusIcon(String(v))}
            <span className="sr-only">狀態：</span>{getStatusLabel(String(v))}
          </span>
        )
      }
    },
    {
      key: 'payment_status',
      label: s.paymentStatus,
      sortable: true,
      hideable: true,
      render: (_v, row) => {
        if (row.status !== 'completed' && row.status !== 'partial_return') return null
        const isOverdue = row.payment_status === 'unpaid' && row.payment_due_date && row.payment_due_date < new Date().toISOString().slice(0, 10)
        if (row.payment_status === 'paid') {
          return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400"><BadgeCheck className="w-3 h-3 shrink-0" aria-hidden="true" /><span className="sr-only">付款狀態：</span>{s.paid}</span>
        }
        if (isOverdue) {
          return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400"><AlertTriangleIcon className="w-3 h-3 shrink-0" aria-hidden="true" /><span className="sr-only">付款狀態：</span>{s.overdue}</span>
        }
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"><Circle className="w-3 h-3 shrink-0" aria-hidden="true" /><span className="sr-only">付款狀態：</span>{s.unpaid}</span>
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
            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title={s.cloneOrder}
            onClick={() => handleClone(row.id as number)}
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
            title={t.common.exportPdf}
            onClick={() => window.electronAPI.print.pdf({ type: 'sales', id: row.id as number })}
          >
            <Printer className="w-3.5 h-3.5" />
          </Button>
          {(row.status === 'completed' || row.status === 'partial_return') && row.payment_status !== 'paid' && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-green-400 hover:text-green-500"
              title={s.markPaid}
              onClick={() => setMarkPaidId(row.id as number)}
            >
              <BadgeCheck className="w-3.5 h-3.5" />
            </Button>
          )}
          {(row.status === 'completed' || row.status === 'partial_return') && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-amber-400 hover:text-amber-500"
              title="部分退貨"
              onClick={async () => {
                const order = await window.electronAPI.sales.getById(row.id as number)
                if (order) setPartialReturnOrder(order as SalesOrder)
              }}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
            </Button>
          )}
          {row.status === 'completed' && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-orange-400 hover:text-orange-500"
              title={s.returnOrder}
              onClick={() => setReturnId(row.id)}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {row.status === 'pending' && (
            <>
              {spotlight?.type === 'sales' && spotlight.id === row.id ? (
                <span className="relative inline-flex items-center justify-center">
                  <span className="absolute inset-0 rounded-md ring-2 ring-green-400 animate-ping opacity-75" />
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-green-400 ring-2 ring-green-400 ring-offset-1 ring-offset-background bg-green-400/15"
                    onClick={() => setCompleteId(row.id)} title={s.completeTitle}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </Button>
                </span>
              ) : (
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-green-400"
                  onClick={() => setCompleteId(row.id)} title={s.completeTitle}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-yellow-400"
                onClick={() => setCancelId(row.id)} title={s.cancelTitle}
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
          placeholder={s.searchPlaceholder}
          value={search}
          onChange={setSearch}
          storageKey="ims-recent-search-sales"
        />
        <Input type="date" className="h-9 w-36 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title={s.dateFrom} />
        <Input type="date" className="h-9 w-36 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title={s.dateTo} />
        {(dateFrom || dateTo) && (
          <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('from'); n.delete('to'); return n }, { replace: true })}>{s.clearDates}</button>
        )}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-9 w-28 text-xs">
            <SelectValue placeholder={t.common.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">全部狀態</SelectItem>
            <SelectItem value="pending" className="text-xs">{t.status.pending}</SelectItem>
            <SelectItem value="completed" className="text-xs">{t.status.completed}</SelectItem>
            <SelectItem value="cancelled" className="text-xs">{t.status.cancelled}</SelectItem>
          </SelectContent>
        </Select>
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
        storageKey="sales"
        currentFilters={{ search, dateFrom, dateTo }}
        saveLabel={s.saveFilter}
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
          onClick={async () => { setExporting(true); await window.electronAPI.export.sales(); setExporting(false) }}
        >
          <Download className="w-4 h-4" />
          {exporting ? t.common.exporting : t.common.exportCsv}
        </Button>
        <div className="relative">
          <Button onClick={() => { captureFormFocus(); setFormOpen(true) }} className="gap-2">
            <Plus className="w-4 h-4" />
            {s.addOrder}
          </Button>
          {btnHintVisible && (
            <div className="absolute top-full mt-1 left-0 text-xs text-muted-foreground bg-popover border rounded px-2 py-1 shadow-sm whitespace-nowrap animate-fade-in pointer-events-none z-10">
              ↓ 按 <kbd className="font-mono border rounded px-1 text-[10px]">N</kbd> 快速新增
            </div>
          )}
        </div>
        <div className="flex items-center rounded-md border border-border overflow-hidden ml-auto">
          {(['compact', 'normal', 'relaxed'] as const).map((d, i) => {
            const Icon = [AlignJustify, List, LayoutList][i]
            return (
              <button key={d} title={d} className={`h-9 px-2.5 transition-colors ${density === d ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => { setDensity(d); localStorage.setItem('ims-dt-density-sales', d) }}>
                <Icon className="w-4 h-4" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Rule 72: Summary Strip */}
      {!isLoading && (
        <div className="text-xs text-muted-foreground flex items-center gap-4 py-1 px-0.5">
          <span>共 {summary.count} 筆</span>
          <span>·</span>
          {summary.pendingCount > 0 ? (
            <button
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer
                ${statusFilter === 'pending'
                  ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
              onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')}
              title={statusFilter === 'pending' ? '點擊取消篩選' : '點擊篩選待處理訂單'}
            >
              {summary.pendingCount} 筆待處理
            </button>
          ) : (
            <span>{summary.pendingCount} 筆待處理</span>
          )}
          <span>·</span>
          <span>{summary.completedCount} 筆完成</span>
          <span>·</span>
          <span>總金額 {formatCurrency(summary.totalAmount)}</span>
        </div>
      )}

      {/* A11y Rule 103: Announce search results to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {search ? `找到 ${(orders ?? []).length} 筆結果` : ''}
      </div>
      <div className="rounded-lg border border-border bg-card" aria-busy={isLoading} aria-label="銷售單列表">
        {isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <DataTable
            tableLabel="銷售單列表"
            data={(orders ?? []) as unknown as Record<string, unknown>[]}
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            keyField="id"
            storageKey="sales"
            onRowFocus={(row) => setDetailId(row.id as number)}
            density={density}
            hint={dtHintVisible ? (
              <span className="text-xs text-muted-foreground bg-popover border rounded px-2 py-1 shadow-sm animate-fade-in pointer-events-none">
                ↑↓ 鍵盤導覽 · 右鍵選單
              </span>
            ) : undefined}
            contextMenu={(row) => {
              const order = row as unknown as SalesOrder
              const items: ContextMenuItem[] = [
                { label: t.common.view, icon: Eye as LucideIcon, onClick: () => setDetailId(order.id as number) },
                { label: s.cloneOrder, icon: Copy as LucideIcon, onClick: () => handleClone(order.id as number) },
              ]
              if (order.status === 'pending') {
                items.push({ label: s.completeTitle, icon: CheckCircle as LucideIcon, onClick: () => setCompleteId(order.id as number) })
                items.push({ label: s.cancelTitle, icon: XCircle as LucideIcon, onClick: () => setCancelId(order.id as number) })
                items.push({ label: s.deleteTitle, icon: Trash2 as LucideIcon, variant: 'destructive', separator: true, onClick: () => setDeleteId(order.id as number) })
              }
              if ((order.status === 'completed' || order.status === 'partial_return') && order.payment_status !== 'paid') {
                items.push({ label: s.markPaid, icon: BadgeCheck as LucideIcon, onClick: () => setMarkPaidId(order.id as number) })
              }
              return items
            }}
            emptyMessage={s.emptyMessage}
            emptyState={!search && !dateFrom && !dateTo ? (
              <EmptyState
                icon={Receipt}
                title={s.emptyTitle}
                description={s.emptyDesc}
                action={{ label: s.emptyAction, onClick: () => setFormOpen(true) }}
              />
            ) : undefined}
            expandable
            renderExpanded={(row) => <SaleExpandedRow orderId={row.id as number} />}
          />
        )}
      </div>

      <SaleForm open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) { setCloneData(null); restoreFormFocus() } }} initialData={cloneData ?? undefined} />
      {detailId !== null && (
        <SaleDetail id={detailId} open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)} />
      )}
      <ConfirmDialog
        open={completeId !== null}
        onOpenChange={(open) => !open && setCompleteId(null)}
        title={s.completeTitle}
        description={s.completeDesc}
        onConfirm={() => completeId && completeMutation.mutate(completeId)}
        confirmLabel={s.completeTitle}
        variant="default"
      />
      <ConfirmDialog
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
        title={s.cancelTitle}
        description={s.cancelDesc}
        onConfirm={() => cancelId && cancelMutation.mutate(cancelId)}
        confirmLabel={s.cancelTitle}
      />
      <ConfirmDialog
        open={returnId !== null}
        onOpenChange={(open) => !open && setReturnId(null)}
        title={s.returnTitle}
        description={s.returnDesc}
        onConfirm={() => returnId && returnMutation.mutate(returnId)}
        confirmLabel={s.returnConfirm}
      />
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={s.deleteTitle}
        description={s.deleteDesc}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
      <ConfirmDialog
        open={markPaidId !== null}
        onOpenChange={(open) => !open && setMarkPaidId(null)}
        title={s.markPaidTitle}
        description={s.markPaidDesc}
        onConfirm={() => markPaidId && markPaidMutation.mutate(markPaidId)}
        confirmLabel={s.markPaid}
        variant="default"
      />
      <PartialReturnDialog
        open={partialReturnOrder !== null}
        onOpenChange={(open) => !open && setPartialReturnOrder(null)}
        order={partialReturnOrder}
        onSuccess={() => setPartialReturnOrder(null)}
      />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">已選 {selectedIds.size} 筆</span>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-green-400 border-green-400/30 hover:text-green-400"
            onClick={() => batchCompleteMutation.mutate(Array.from(selectedIds))}
            disabled={batchCompleteMutation.isPending}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            批次完成
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-blue-400 border-blue-400/30 hover:text-blue-400"
            onClick={() => batchMarkPaidMutation.mutate(Array.from(selectedIds))}
            disabled={batchMarkPaidMutation.isPending}
          >
            <BadgeCheck className="w-3.5 h-3.5" />
            {s.batchMarkPaid ?? '批次標記付款'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-red-400 border-red-400/30 hover:text-red-400"
            onClick={() => batchCancelMutation.mutate(Array.from(selectedIds))}
            disabled={batchCancelMutation.isPending}
          >
            <XCircle className="w-3.5 h-3.5" />
            批次取消
          </Button>
          <Button
            size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
            onClick={() => {
              const rows = (orders ?? []).filter((o) => selectedIds.has(o.id as number))
              const header = '訂單號,客戶,訂單日期,狀態,付款狀態,金額'
              const lines = rows.map((o) =>
                [`"${o.order_no}"`, `"${o.customer_name ?? ''}"`, o.order_date, o.status, o.payment_status ?? '', o.total_amount].join(',')
              )
              const csv = '\uFEFF' + [header, ...lines].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `sales-export-${new Date().toISOString().slice(0, 10)}.csv`
              a.click(); URL.revokeObjectURL(url)
              toast({ title: `已匯出 ${rows.length} 筆`, variant: 'success' })
            }}
          >
            <FileDown className="w-3.5 h-3.5" />匯出選取
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedIds(new Set())}>
            {t.common.cancel}
          </Button>
        </div>
      )}
    </div>
  )
}
