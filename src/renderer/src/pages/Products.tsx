import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, AlertTriangle, SlidersHorizontal, History, Download, Upload, ShoppingCart, Package, Pencil, LayoutGrid, Table2, AlignJustify, List, LayoutList } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/common/DataTable'
import { SearchWithHistory } from '@/components/common/SearchWithHistory'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { TableSkeleton } from '@/components/common/TableSkeleton'
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
import { useSuccessFlash } from '@/lib/useSuccessFlash'

export default function Products() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useLang()
  const p = t.products
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const categoryFilter = searchParams.get('cat') ?? '__all__'
  const stockFilter = searchParams.get('sf') ?? '__all__'

  const setSearch = (v: string) => setSearchParams((prev) => { const n = new URLSearchParams(prev); if (v) n.set('q', v); else n.delete('q'); return n }, { replace: true })
  const setCategoryFilter = (v: string) => setSearchParams((prev) => { const n = new URLSearchParams(prev); if (v !== '__all__') n.set('cat', v); else n.delete('cat'); return n }, { replace: true })
  const setStockFilter = (v: string) => setSearchParams((prev) => { const n = new URLSearchParams(prev); if (v !== '__all__') n.set('sf', v); else n.delete('sf'); return n }, { replace: true })
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ id: number; snapshot: Product } | null>(null)
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
  const [editingCell, setEditingCell] = useState<{ id: number; field: 'sell_price' | 'stock_qty' } | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    return (localStorage.getItem('ims-products-view') as 'table' | 'grid') ?? 'table'
  })
  const { flashId, triggerFlash } = useSuccessFlash()
  const [density, setDensity] = useState<'compact' | 'normal' | 'relaxed'>(() =>
    (localStorage.getItem('ims-dt-density-products') as 'compact' | 'normal' | 'relaxed') ?? 'normal'
  )

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
    mutationFn: ({ id }: { id: number; snapshot: Product }) => window.electronAPI.products.delete(id),
    onSuccess: (_data, { snapshot }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      const { dismiss } = toast({
        title: `已刪除「${snapshot.name}」`,
        duration: 5000,
        action: {
          label: '復原',
          onClick: async () => {
            dismiss()
            await window.electronAPI.products.create({
              sku: snapshot.sku, name: snapshot.name, category: snapshot.category,
              sell_price: snapshot.sell_price, buy_price: snapshot.buy_price,
              stock_qty: snapshot.stock_qty, reorder_pt: snapshot.reorder_pt,
              unit: snapshot.unit, description: snapshot.description
            })
            queryClient.invalidateQueries({ queryKey: ['products'] })
          }
        }
      })
    }
  })

  const inlineUpdateMutation = useMutation({
    mutationFn: ({ id, field, value }: { id: number; field: 'sell_price' | 'stock_qty'; value: number }) =>
      window.electronAPI.products.update(id, { [field]: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    onError: () => toast({ title: '更新失敗', variant: 'destructive' })
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
      render: (v, row) => {
        const product = row as unknown as Product
        if (editingCell?.id === product.id && editingCell.field === 'stock_qty') {
          return (
            <input
              autoFocus
              type="number"
              min="0"
              defaultValue={Number(v)}
              className="h-7 w-20 text-right text-sm px-2 border rounded focus:ring-1 focus:ring-ring bg-background"
              onBlur={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val) && val >= 0 && val !== Number(v)) {
                  inlineUpdateMutation.mutate({ id: product.id as number, field: 'stock_qty', value: val })
                }
                setEditingCell(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') setEditingCell(null)
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return (
          <div
            className="group flex items-center justify-end gap-1 cursor-pointer"
            onClick={() => setEditingCell({ id: product.id as number, field: 'stock_qty' })}
          >
            <span className={product.stock_qty <= product.reorder_pt ? 'text-yellow-400 font-semibold' : ''}>
              {formatNumber(Number(v))}
              {product.stock_qty <= product.reorder_pt && (
                <AlertTriangle className="inline ml-1 w-3 h-3" />
              )}
            </span>
            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-60 shrink-0" />
          </div>
        )
      }
    },
    { key: 'unit', label: p.unit, className: 'w-16 text-center', hideable: true },
    {
      key: 'sell_price',
      label: p.sellPrice,
      sortable: true,
      className: 'text-right w-24',
      hideable: true,
      render: (v, row) => {
        const product = row as unknown as Product
        if (editingCell?.id === product.id && editingCell.field === 'sell_price') {
          return (
            <input
              autoFocus
              type="number"
              min="0"
              defaultValue={Number(v)}
              className="h-7 w-24 text-right text-sm px-2 border rounded focus:ring-1 focus:ring-ring bg-background"
              onBlur={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val) && val >= 0 && val !== Number(v)) {
                  inlineUpdateMutation.mutate({ id: product.id as number, field: 'sell_price', value: val })
                }
                setEditingCell(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') setEditingCell(null)
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return (
          <div
            className="group flex items-center justify-end gap-1 cursor-pointer"
            onClick={() => setEditingCell({ id: product.id as number, field: 'sell_price' })}
          >
            <span>{formatCurrency(Number(v))}</span>
            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-60 shrink-0" />
          </div>
        )
      }
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
            onClick={() => setPendingDelete({ id: row.id as number, snapshot: row as unknown as Product })}
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
        <SearchWithHistory
          className="flex-1 max-w-sm"
          placeholder={p.searchPlaceholder}
          value={search}
          onChange={setSearch}
          storageKey="ims-recent-search-products"
        />
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
            onClick={() => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('cat'); n.delete('sf'); return n }, { replace: true })}
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
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          <button
            className={`h-9 px-2.5 transition-colors ${viewMode === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => { setViewMode('table'); localStorage.setItem('ims-products-view', 'table') }}
          >
            <Table2 className="w-4 h-4" />
          </button>
          <button
            className={`h-9 px-2.5 transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => { setViewMode('grid'); localStorage.setItem('ims-products-view', 'grid') }}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          {(['compact', 'normal', 'relaxed'] as const).map((d, i) => {
            const Icon = [AlignJustify, List, LayoutList][i]
            return (
              <button
                key={d}
                title={d}
                className={`h-9 px-2.5 transition-colors ${density === d ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => { setDensity(d); localStorage.setItem('ims-dt-density-products', d) }}
              >
                <Icon className="w-4 h-4" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Table / Grid */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-card"><TableSkeleton rows={8} cols={6} /></div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {(products ?? []).length === 0 ? (
            !search && !hasFilter ? (
              <div className="col-span-full">
                <EmptyState
                  icon={Package}
                  title={p.emptyTitle}
                  description={p.emptyDesc}
                  action={{ label: p.emptyAction, onClick: () => { setEditProduct(null); setFormOpen(true) } }}
                />
              </div>
            ) : (
              <div className="col-span-full flex items-center justify-center h-32 text-sm text-muted-foreground">{p.emptyMessage}</div>
            )
          ) : (products ?? []).map((product) => (
            <div
              key={product.id}
              className="group relative rounded-lg border border-border bg-card p-3 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setDetailProduct(product)}
            >
              <div className="flex justify-center mb-2">
                <ProductThumbnail productId={product.id} size={80} />
              </div>
              <p className="text-sm font-medium truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className={`text-xs flex items-center gap-0.5 ${product.stock_qty <= product.reorder_pt ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                  {formatNumber(product.stock_qty)}
                  {product.stock_qty <= product.reorder_pt && <AlertTriangle className="w-3 h-3" />}
                </span>
                <span className="text-sm font-semibold">{formatCurrency(product.sell_price)}</span>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="h-6 w-6 flex items-center justify-center rounded bg-background border border-border text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); setEditProduct(product); setFormOpen(true) }}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  className="h-6 w-6 flex items-center justify-center rounded bg-background border border-border text-blue-400 hover:text-blue-500"
                  onClick={(e) => { e.stopPropagation(); setQuickPurchaseProduct(product) }}
                >
                  <ShoppingCart className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <DataTable
            data={(products ?? []) as unknown as Record<string, unknown>[]}
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            keyField="id"
            emptyMessage={p.emptyMessage}
            storageKey="products"
            onRowFocus={(row) => setDetailProduct(row as unknown as Product)}
            flashRowId={flashId}
            density={density}
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
        </div>
      )}

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
        onSaved={triggerFlash}
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
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={p.deleteTitle}
        description={p.deleteDesc}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete)}
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
            onClick={() => { setPendingDelete({ id: contextMenu.product.id as number, snapshot: contextMenu.product }); setContextMenu(null) }}
          >
            <Trash2 className="w-3.5 h-3.5" />{t.common.delete}
          </button>
        </div>
      )}
    </div>
  )
}

function ProductThumbnail({ productId, size = 32 }: { productId: number; size?: number }) {
  const { data: image } = useQuery<string | null>({
    queryKey: ['products', 'image', productId],
    queryFn: () => window.electronAPI.products.getImage(productId),
    staleTime: 1000 * 60 * 5
  })
  const cls = `rounded object-cover shrink-0`
  return image ? (
    <img src={image} alt="" className={cls} style={{ width: size, height: size }} />
  ) : (
    <div className="rounded bg-muted/40 flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <Package className="w-4 h-4 text-muted-foreground/30" />
    </div>
  )
}
