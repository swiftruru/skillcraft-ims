import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Eye, CheckCircle, XCircle, Trash2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PurchaseForm } from '@/components/purchases/PurchaseForm'
import { PurchaseDetail } from '@/components/purchases/PurchaseDetail'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { PurchaseOrder } from '@/types/schema'

export default function Purchases() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [receiveId, setReceiveId] = useState<number | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: orders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchases', 'all', search],
    queryFn: () => window.electronAPI.purchases.getAll({ search: search || undefined })
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.purchases.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] })
  })

  const columns: Column<PurchaseOrder>[] = [
    { key: 'order_no', label: '訂單號', sortable: true, className: 'font-mono text-xs w-36' },
    { key: 'supplier_name', label: '供應商', sortable: true },
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
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
            title="匯出 PDF"
            onClick={() => window.electronAPI.print.pdf({ type: 'purchase', id: row.id as number })}
          >
            <Printer className="w-3.5 h-3.5" />
          </Button>
          {row.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-400"
                onClick={() => setReceiveId(row.id)}
                title="確認收貨"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-yellow-400"
                onClick={() => setCancelId(row.id)}
                title="取消訂單"
              >
                <XCircle className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="搜尋訂單號或供應商..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          新增採購單
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
            emptyMessage="沒有採購單"
          />
        )}
      </div>

      <PurchaseForm open={formOpen} onOpenChange={setFormOpen} />

      {detailId !== null && (
        <PurchaseDetail
          id={detailId}
          open={detailId !== null}
          onOpenChange={(open) => !open && setDetailId(null)}
        />
      )}

      <ConfirmDialog
        open={receiveId !== null}
        onOpenChange={(open) => !open && setReceiveId(null)}
        title="確認收貨"
        description="確認收貨後，系統將自動更新各商品的庫存數量，此操作無法復原。"
        onConfirm={() => receiveId && receiveMutation.mutate(receiveId)}
        confirmLabel="確認收貨"
        variant="default"
      />
      <ConfirmDialog
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="取消採購單"
        description="取消後此採購單將無法再收貨。"
        onConfirm={() => cancelId && cancelMutation.mutate(cancelId)}
        confirmLabel="取消訂單"
      />
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="刪除採購單"
        description="刪除後無法復原，確認刪除此採購單？"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  )
}
