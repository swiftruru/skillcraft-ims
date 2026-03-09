import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Eye, CheckCircle, XCircle, Trash2, Printer, Download, Undo2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { SaleForm } from '@/components/sales/SaleForm'
import { SaleDetail } from '@/components/sales/SaleDetail'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { SalesOrder } from '@/types/schema'
import { useLang } from '@/lib/useLang'
import { useDemoStore } from '@/stores/demo.store'

export default function Sales() {
  const queryClient = useQueryClient()
  const t = useLang()
  const s = t.sales
  const spotlight = useDemoStore((st) => st.spotlight)
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
  const [completeId, setCompleteId] = useState<number | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [returnId, setReturnId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [cloneData, setCloneData] = useState<Record<string, unknown> | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: orders, isLoading } = useQuery<SalesOrder[]>({
    queryKey: ['sales', 'all', search, dateFrom, dateTo],
    queryFn: () => window.electronAPI.sales.getAll({
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    })
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.sales.complete(id),
    onSuccess: (result) => {
      if ((result as {success:boolean}).success) {
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['reports'] })
      } else {
        setError(result.error ?? s.opFailed)
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
    { key: 'order_no', label: s.orderNo, sortable: true, className: 'font-mono text-xs w-36' },
    { key: 'customer_name', label: s.customer, sortable: true },
    { key: 'order_date', label: s.orderDate, sortable: true, render: (v) => formatDate(String(v)) },
    {
      key: 'status',
      label: t.common.status,
      sortable: true,
      render: (v) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(String(v))}`}>
          {getStatusLabel(String(v))}
        </span>
      )
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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={s.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input type="date" className="h-9 w-36 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title={s.dateFrom} />
        <Input type="date" className="h-9 w-36 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title={s.dateTo} />
        {(dateFrom || dateTo) && (
          <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => { setDateFrom(''); setDateTo('') }}>{s.clearDates}</button>
        )}
        <Button
          variant="outline" className="gap-2" disabled={exporting}
          onClick={async () => { setExporting(true); await window.electronAPI.export.sales(); setExporting(false) }}
        >
          <Download className="w-4 h-4" />
          {exporting ? t.common.exporting : t.common.exportCsv}
        </Button>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {s.addOrder}
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
            emptyMessage={s.emptyMessage}
          />
        )}
      </div>

      <SaleForm open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setCloneData(null) }} initialData={cloneData ?? undefined} />
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
    </div>
  )
}
