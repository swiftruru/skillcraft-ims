import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProductForm } from '@/components/products/ProductForm'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { Product } from '@/types/schema'

export default function Products() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products', 'all', search],
    queryFn: () => window.electronAPI.products.getAll({ search: search || undefined })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.products.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  })

  const columns: Column<Product>[] = [
    { key: 'sku', label: 'SKU', sortable: true, className: 'font-mono text-xs w-32' },
    { key: 'name', label: '商品名稱', sortable: true },
    { key: 'category', label: '類別', sortable: true, render: (v) => (
      <Badge variant="secondary" className="text-xs">{String(v)}</Badge>
    )},
    {
      key: 'stock_qty',
      label: '庫存',
      sortable: true,
      className: 'text-right w-20',
      render: (v, row) => (
        <span className={row.stock_qty <= row.reorder_pt ? 'text-yellow-400 font-semibold' : ''}>
          {formatNumber(Number(v))}
          {row.stock_qty <= row.reorder_pt && (
            <AlertTriangle className="inline ml-1 w-3 h-3" />
          )}
        </span>
      )
    },
    { key: 'unit', label: '單位', className: 'w-16 text-center' },
    {
      key: 'sell_price',
      label: '售價',
      sortable: true,
      className: 'text-right w-24',
      render: (v) => formatCurrency(Number(v))
    },
    {
      key: 'buy_price',
      label: '進價',
      sortable: true,
      className: 'text-right w-24',
      render: (v) => formatCurrency(Number(v))
    },
    {
      key: 'id',
      label: '',
      className: 'w-20 text-right',
      render: (_v, row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setEditProduct(row); setFormOpen(true) }}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteId(row.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜尋商品名稱或 SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => { setEditProduct(null); setFormOpen(true) }} className="gap-2">
          <Plus className="w-4 h-4" />
          新增商品
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <DataTable
            data={(products ?? []) as unknown as Record<string, unknown>[]}
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            keyField="id"
            emptyMessage="沒有商品，請新增第一個商品"
          />
        )}
      </div>

      {/* Stats */}
      {products && (
        <p className="text-xs text-muted-foreground">
          共 {products.length} 項商品 ·{' '}
          {products.filter((p) => p.stock_qty <= p.reorder_pt).length} 項低庫存
        </p>
      )}

      {/* Product Form Dialog */}
      <ProductForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditProduct(null)
        }}
        product={editProduct}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="刪除商品"
        description="刪除後無法復原，相關的採購/銷售明細中的商品將無法顯示名稱。"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  )
}
