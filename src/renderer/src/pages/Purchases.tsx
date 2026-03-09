import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Eye, CheckCircle, XCircle, Trash2, Printer, Download, Undo2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PurchaseForm } from '@/components/purchases/PurchaseForm'
import { PurchaseDetail } from '@/components/purchases/PurchaseDetail'
import { ReceivePurchaseDialog } from '@/components/purchases/ReceivePurchaseDialog'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { PurchaseOrder } from '@/types/schema'
import { useLang } from '@/lib/useLang'
import { useDemoStore } from '@/stores/demo.store'

export default function Purchases() {
  const queryClient = useQueryClient()
  const t = useLang()
  const p = t.purchases
  const spotlight = useDemoStore((s) => s.spotlight)
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    if ((location.state as { openForm?: boolean } | null)?.openForm) {
      setFormOpen(true)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [])
  const [detailId, setDetailId] = useState<number | null>(null)
  const [receiveId, setReceiveId] = useState<number | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [returnId, setReturnId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [cloneData, setCloneData] = useState<Record<string, unknown> | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
        setError(result.error ?? '退貨失敗')
      }
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.purchases.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] })
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
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400">逾期</span>
            )}
          </div>
        )
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
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailId(row.id)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="複製訂單"
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
          {row.status === 'received' && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-orange-400 hover:text-orange-500"
              title="退貨"
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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={p.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input type="date" className="h-9 w-36 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="開始日期" />
        <Input type="date" className="h-9 w-36 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="結束日期" />
        {(dateFrom || dateTo) && (
          <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => { setDateFrom(''); setDateTo('') }}>清除</button>
        )}
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
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <DataTable
            data={(orders ?? []) as unknown as Record<string, unknown>[]}
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            keyField="id"
            emptyMessage={p.emptyMessage}
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
        title="確認採購退貨"
        description="退貨後庫存將自動扣減，並寫入異動記錄，此操作不可撤銷。確定要退貨嗎？"
        onConfirm={() => returnId && returnMutation.mutate(returnId)}
        confirmLabel="確認退貨"
      />
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={p.deleteTitle}
        description={p.deleteDesc}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  )
}
