import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, AlertTriangle, SlidersHorizontal, History, Download, Upload, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProductForm } from '@/components/products/ProductForm'
import { AdjustInventoryDialog } from '@/components/products/AdjustInventoryDialog'
import { AdjustmentHistoryDialog } from '@/components/products/AdjustmentHistoryDialog'
import { PurchaseSuggestionDialog } from '@/components/inventory/PurchaseSuggestionDialog'
import { ImportCsvDialog } from '@/components/products/ImportCsvDialog'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { Product } from '@/types/schema'
import { useLang } from '@/lib/useLang'

export default function Products() {
  const queryClient = useQueryClient()
  const t = useLang()
  const p = t.products
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null)
  const [exporting, setExporting] = useState(false)
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

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
    { key: 'name', label: p.title, sortable: true },
    { key: 'category', label: p.category, sortable: true, render: (v) => (
      <Badge variant="secondary" className="text-xs">{String(v)}</Badge>
    )},
    {
      key: 'stock_qty',
      label: p.stock,
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
    { key: 'unit', label: p.unit, className: 'w-16 text-center' },
    {
      key: 'sell_price',
      label: p.sellPrice,
      sortable: true,
      className: 'text-right w-24',
      render: (v) => formatCurrency(Number(v))
    },
    {
      key: 'buy_price',
      label: p.buyPrice,
      sortable: true,
      className: 'text-right w-24',
      render: (v) => formatCurrency(Number(v))
    },
    {
      key: 'id',
      label: '',
      className: 'w-36 text-right',
      render: (_v, row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title={p.adjustHistory}
            onClick={() => setHistoryProduct(row as unknown as Product)}
          >
            <History className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title={p.adjustInventory}
            onClick={() => setAdjustProduct(row as unknown as Product)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setEditProduct(row as unknown as Product); setFormOpen(true) }}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteId(row.id as number)}
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
            placeholder={p.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setSuggestionOpen(true)}>
          <ShoppingCart className="w-4 h-4" />
          {p.purchaseSuggestion}
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4" />
          {t.common.importCsv}
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          disabled={exporting}
          onClick={async () => {
            setExporting(true)
            await window.electronAPI.export.products()
            setExporting(false)
          }}
        >
          <Download className="w-4 h-4" />
          {exporting ? t.common.exporting : t.common.exportCsv}
        </Button>
        <Button onClick={() => { setEditProduct(null); setFormOpen(true) }} className="gap-2">
          <Plus className="w-4 h-4" />
          {p.addProduct}
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
            emptyMessage={p.emptyMessage}
          />
        )}
      </div>

      {/* Stats */}
      {products && (
        <p className="text-xs text-muted-foreground">
          {p.statsText(products.length, products.filter((p) => p.stock_qty <= p.reorder_pt).length)}
        </p>
      )}

      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
      <PurchaseSuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
      <ProductForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditProduct(null) }}
        product={editProduct}
      />
      <AdjustmentHistoryDialog
        open={historyProduct !== null}
        onOpenChange={(open) => !open && setHistoryProduct(null)}
        product={historyProduct}
      />
      <AdjustInventoryDialog
        open={adjustProduct !== null}
        onOpenChange={(open) => !open && setAdjustProduct(null)}
        product={adjustProduct}
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
