import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Eye, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { SaleForm } from '@/components/sales/SaleForm'
import { SaleDetail } from '@/components/sales/SaleDetail'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { SalesOrder } from '@/types/schema'

export default function Sales() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [completeId, setCompleteId] = useState<number | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: orders, isLoading } = useQuery<SalesOrder[]>({
    queryKey: ['sales', 'all', search],
    queryFn: () => window.electronAPI.sales.getAll({ search: search || undefined })
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.sales.complete(id),
    onSuccess: (result) => {
      if ((result as {success:boolean}).success) {
        queryClient.invalidateQueries({ queryKey: ['sales'] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['reports'] })
      } else {
        setError(result.error ?? '操作失敗')
      }
    }
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.sales.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales'] })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.sales.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales'] })
  })

  const columns: Column<SalesOrder>[] = [
    { key: 'order_no', label: '訂單號', sortable: true, className: 'font-mono text-xs w-36' },
    { key: 'customer_name', label: '客戶', sortable: true },
    { key: 'order_date', label: '訂單日期', sortable: true, render: (v) => formatDate(String(v)) },
    {
      key: 'status',
      label: '狀態',
      sortable: true,
      render: (v) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(String(v))}`}>
          {getStatusLabel(String(v))}
        </span>
      )
    },
    {
      key: 'total_amount',
      label: '金額',
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
          {row.status === 'pending' && (
            <>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-green-400"
                onClick={() => setCompleteId(row.id)} title="完成銷售"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-yellow-400"
                onClick={() => setCancelId(row.id)} title="取消"
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

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="搜尋訂單號或客戶..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          新增銷售單
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
            emptyMessage="沒有銷售單"
          />
        )}
      </div>

      <SaleForm open={formOpen} onOpenChange={setFormOpen} />
      {detailId !== null && (
        <SaleDetail id={detailId} open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)} />
      )}
      <ConfirmDialog
        open={completeId !== null}
        onOpenChange={(open) => !open && setCompleteId(null)}
        title="完成銷售"
        description="完成後系統將自動扣除各商品庫存，請確認庫存足夠。"
        onConfirm={() => completeId && completeMutation.mutate(completeId)}
        confirmLabel="確認完成"
        variant="default"
      />
      <ConfirmDialog
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="取消銷售單"
        description="取消後此訂單將無法再完成。"
        onConfirm={() => cancelId && cancelMutation.mutate(cancelId)}
        confirmLabel="取消訂單"
      />
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="刪除銷售單"
        description="刪除後無法復原。"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  )
}
