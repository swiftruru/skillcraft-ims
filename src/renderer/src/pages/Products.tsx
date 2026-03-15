import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, AlertTriangle, SlidersHorizontal, History, Download, Upload, ShoppingCart, Package } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProductForm } from '@/components/products/ProductForm'
import { AdjustInventoryDialog } from '@/components/products/AdjustInventoryDialog'
import { ProductDetailDialog } from '@/components/products/ProductDetailDialog'
import { PurchaseSuggestionDialog } from '@/components/inventory/PurchaseSuggestionDialog'
import { ImportCsvDialog } from '@/components/products/ImportCsvDialog'
import { QuickPurchaseDialog } from '@/components/purchases/QuickPurchaseDialog'
import { BatchPriceDialog } from '@/components/products/BatchPriceDialog'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import type { Product } from '@/types/schema'
import { useLang } from '@/lib/useLang'

export default function Products() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useLang()
  const p = t.products
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('__all__')
  const [stockFilter, setStockFilter] = useState<string>(
    (location.state as { stockFilter?: string } | null)?.stockFilter ?? '__all__'
  )
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [exporting, setExporting] = useState(false)
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)
  const [batchPriceOpen, setBatchPriceOpen] = useState(false)
  const [quickPurchaseProduct, setQuickPurchaseProduct] = useState<Product | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; product: Product } | null>(null)

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    return () => { window.removeEventListener('click', close); window.removeEventListener('contextmenu', close) }
  }, [])

  useEffect(() => {
    const handler = () => { setEditProduct(null); setFormOpen(true) }
    window.addEventListener('ims:new-item', handler)
    return () => window.removeEventListener('ims:new-item', handler)
  }, [])

  const { data: categories } = useQuery<string[]>({
    queryKey: ['products', 'categories'],
    queryFn: () => window.electronAPI.products.getCategories(),
    staleTime: 1000 * 60 * 5
  })

  const { data: allProducts, isLoading } = useQuery<Product[]>({
    queryKey: ['products', 'all', search, categoryFilter, stockFilter === 'low'],
    queryFn: () => window.electronAPI.products.getAll({
      search: search || undefined,
      category: categoryFilter !== '__all__' ? categoryFilter : undefined,
      lowStock: stockFilter === 'low' ? true : undefined
    })
  })

  const products = stockFilter === 'zero'
    ? (allProducts ?? []).filter((p) => p.stock_qty === 0)
    : allProducts

  const hasFilter = categoryFilter !== '__all__' || stockFilter !== '__all__'

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.products.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  })

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => window.electronAPI.products.batchDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setSelectedIds(new Set())
    }
  })

  const batchUpdateMutation = useMutation({
    mutationFn: ({ ids, category }: { ids: number[]; category: string }) =>
      window.electronAPI.products.batchUpdate(ids, { category }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setSelectedIds(new Set())
      toast({ title: `已更新 ${res.updated} 項分類`, variant: 'success' })
    },
    onError: () => toast({ title: '更新失敗', variant: 'destructive' })
  })

  const allIds = (products ?? []).map((p) => p.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(allIds))
  }
  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const columns: Column<Product>[] = [
    {
      key: '__check__' as keyof Product,
      label: '',
      className: 'w-10',
      render: (_v, row) => (
        <Checkbox
          checked={selectedIds.has(row.id as number)}
          onCheckedChange={() => toggleOne(row.id as number)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      header: () => (
        <Checkbox
          checked={allSelected}
          onCheckedChange={toggleAll}
        />
      )
    },
    { key: 'sku', label: 'SKU', sortable: true, className: 'font-mono text-xs w-32' },
    { key: 'name', label: p.title, sortable: true, render: (v, row) => (
      <div className="flex items-center gap-2">
        <ProductThumbnail productId={(row as unknown as Product).id} />
        <button
          className="text-left hover:text-primary hover:underline transition-colors"
          onClick={() => setDetailProduct(row as unknown as Product)}
        >
          {String(v)}
        </button>
      </div>
    )},
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
    { key: 'unit', label: p.unit, className: 'w-16 text-center', hideable: true },
    {
      key: 'sell_price',
      label: p.sellPrice,
      sortable: true,
      className: 'text-right w-24',
      render: (v) => formatCurrency(Number(v)),
      hideable: true
    },
    {
      key: 'buy_price',
      label: p.buyPrice,
      sortable: true,
      className: 'text-right w-24',
      render: (v) => formatCurrency(Number(v)),
      hideable: true
    },
    {
      key: 'id',
      label: '',
      className: 'w-36 text-right',
      render: (_v, row) => (
        <div className="flex justify-end gap-1">
          <Button
            data-tour="quick-purchase"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-blue-400 hover:text-blue-500"
            title={p.quickPurchase}
            onClick={() => setQuickPurchaseProduct(row as unknown as Product)}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title={p.adjustHistory}
            onClick={() => setDetailProduct(row as unknown as Product)}
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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={p.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-32 h-9 text-sm">
            <SelectValue placeholder={p.allCategories} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{p.allCategories}</SelectItem>
            {(categories ?? []).map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-28 h-9 text-sm">
            <SelectValue placeholder={p.allStock} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{p.allStock}</SelectItem>
            <SelectItem value="low">{p.lowStock}</SelectItem>
            <SelectItem value="zero">{p.zeroStock}</SelectItem>
          </SelectContent>
        </Select>
        {hasFilter && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => { setCategoryFilter('__all__'); setStockFilter('__all__') }}
          >
            {p.clearFilter}
          </button>
        )}
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
        <Button data-tour="add-product" onClick={() => { setEditProduct(null); setFormOpen(true) }} className="gap-2">
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
            storageKey="products"
            emptyState={!search && !hasFilter ? (
              <EmptyState
                icon={Package}
                title={p.emptyTitle}
                description={p.emptyDesc}
                action={{ label: p.emptyAction, onClick: () => { setEditProduct(null); setFormOpen(true) } }}
              />
            ) : undefined}
            onRowContextMenu={(row, e) => {
              e.preventDefault()
              e.stopPropagation()
              setContextMenu({ x: e.clientX, y: e.clientY, product: row as unknown as Product })
            }}
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
      <ProductDetailDialog
        open={detailProduct !== null}
        onOpenChange={(open) => !open && setDetailProduct(null)}
        product={detailProduct}
      />
      <AdjustInventoryDialog
        open={adjustProduct !== null}
        onOpenChange={(open) => !open && setAdjustProduct(null)}
        product={adjustProduct}
      />
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-card border border-border rounded-xl shadow-2xl px-4 py-2.5">
          <span className="text-sm text-muted-foreground">已選 {selectedIds.size} 項</span>
          <Select onValueChange={(cat) => batchUpdateMutation.mutate({ ids: Array.from(selectedIds), category: cat })}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue placeholder={p.adjustCategory} />
            </SelectTrigger>
            <SelectContent>
              {(categories ?? []).map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBatchPriceOpen(true)}
          >
            {p.adjustPrice}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBatchDeleteOpen(true)}
          >
            {p.batchDelete}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>{t.common.cancel}</Button>
        </div>
      )}

      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        title={p.batchDeleteTitle(selectedIds.size)}
        description={p.batchDeleteDesc(selectedIds.size)}
        onConfirm={() => batchDeleteMutation.mutate(Array.from(selectedIds))}
      />

      <BatchPriceDialog
        open={batchPriceOpen}
        onOpenChange={setBatchPriceOpen}
        selectedIds={Array.from(selectedIds)}
        products={products ?? []}
        onSuccess={() => setSelectedIds(new Set())}
      />
      <QuickPurchaseDialog
        product={quickPurchaseProduct}
        open={quickPurchaseProduct !== null}
        onOpenChange={(open) => !open && setQuickPurchaseProduct(null)}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={p.deleteTitle}
        description={p.deleteDesc}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />

      {contextMenu && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left"
            onClick={() => { setEditProduct(contextMenu.product); setFormOpen(true); setContextMenu(null) }}
          >
            <Edit2 className="w-3.5 h-3.5" />{t.common.edit}
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left"
            onClick={() => { setAdjustProduct(contextMenu.product); setContextMenu(null) }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />{p.adjustInventory}
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left"
            onClick={() => { setQuickPurchaseProduct(contextMenu.product); setContextMenu(null) }}
          >
            <ShoppingCart className="w-3.5 h-3.5" />{p.quickPurchase}
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left"
            onClick={() => { setDetailProduct(contextMenu.product); setContextMenu(null) }}
          >
            <History className="w-3.5 h-3.5" />{p.adjustHistory}
          </button>
          <div className="border-t border-border my-1" />
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left text-destructive"
            onClick={() => { setDeleteId(contextMenu.product.id as number); setContextMenu(null) }}
          >
            <Trash2 className="w-3.5 h-3.5" />{t.common.delete}
          </button>
        </div>
      )}
    </div>
  )
}

function ProductThumbnail({ productId }: { productId: number }) {
  const { data: image } = useQuery<string | null>({
    queryKey: ['products', 'image', productId],
    queryFn: () => window.electronAPI.products.getImage(productId),
    staleTime: 1000 * 60 * 5
  })
  return image ? (
    <img src={image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
  ) : (
    <div className="w-8 h-8 rounded bg-muted/40 flex items-center justify-center shrink-0">
      <Package className="w-4 h-4 text-muted-foreground/30" />
    </div>
  )
}
