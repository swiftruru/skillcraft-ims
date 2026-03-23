import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Wand2, Eye, AlignJustify, List, LayoutList, Download, type LucideIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type Column, type ContextMenuItem } from '@/components/common/DataTable'
import { SearchWithHistory } from '@/components/common/SearchWithHistory'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { TableSkeleton } from '@/components/common/TableSkeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Supplier, SupplierCreate } from '@/types/schema'
import { useLang } from '@/lib/useLang'
import { useSuccessFlash } from '@/lib/useSuccessFlash'
import { formatCurrency } from '@/lib/utils'
import { SupplierDetailDialog } from '@/components/suppliers/SupplierDetailDialog'
import { useToast } from '@/components/ui/use-toast'

const schema = z.object({
  name: z.string().min(1, '供應商名稱必填'),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email 格式不正確').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  credit_limit: z.coerce.number().min(0).optional()
})
type FormValues = z.infer<typeof schema>

export default function Suppliers() {
  const queryClient = useQueryClient()
  const t = useLang()
  const s = t.suppliers
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ id: number; snapshot: Supplier } | null>(null)
  const { flashId, triggerFlash } = useSuccessFlash()
  const [density, setDensity] = useState<'compact' | 'normal' | 'relaxed'>(() =>
    (localStorage.getItem('ims-dt-density-suppliers') as 'compact' | 'normal' | 'relaxed') ?? 'normal'
  )
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)

  useEffect(() => {
    const handler = () => { setEditSupplier(null); reset({ name: '', contact: '', phone: '', email: '', address: '', notes: '', credit_limit: 0 }); setFormOpen(true) }
    window.addEventListener('ims:new-item', handler)
    return () => window.removeEventListener('ims:new-item', handler)
  }, [])

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers', 'all', search],
    queryFn: () => window.electronAPI.suppliers.getAll(search || undefined)
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  })

  const createMutation = useMutation({
    mutationFn: (data: SupplierCreate) => window.electronAPI.suppliers.create(data),
    onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); setFormOpen(false); reset(); if (result && typeof result === 'object' && 'id' in result) triggerFlash((result as { id: number }).id) }
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SupplierCreate> }) => window.electronAPI.suppliers.update(id, data),
    onSuccess: (_r, { id }) => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); setFormOpen(false); setEditSupplier(null); reset(); triggerFlash(id) }
  })
  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: number; snapshot: Supplier }) => window.electronAPI.suppliers.delete(id),
    onSuccess: (_data, { snapshot }) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      const { dismiss } = toast({
        title: `已刪除「${snapshot.name}」`,
        duration: 5000,
        action: {
          label: '復原',
          onClick: async () => {
            dismiss()
            await window.electronAPI.suppliers.create({ name: snapshot.name, contact: snapshot.contact, phone: snapshot.phone, email: snapshot.email, address: snapshot.address, notes: snapshot.notes, credit_limit: snapshot.credit_limit })
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
          }
        }
      })
    }
  })
  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => window.electronAPI.suppliers.batchDelete(ids),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setSelectedIds(new Set())
      setBatchDeleteOpen(false)
      toast({ title: `已刪除選取的供應商` })
    }
  })

  const allIds = (suppliers ?? []).map((sup) => sup.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))
  const toggleAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(allIds))
  const toggleOne = (id: number) => setSelectedIds((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const exportSelected = () => {
    const rows = (suppliers ?? []).filter((item) => selectedIds.has(item.id))
    const header = '供應商名稱,聯絡人,電話,Email,地址,信用額度'
    const lines = rows.map((item) =>
      [
        `"${item.name}"`, item.contact ?? '', item.phone ?? '',
        item.email ?? '', `"${item.address ?? ''}"`,
        item.credit_limit
      ].join(',')
    )
    const csv = '\uFEFF' + [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'suppliers.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const MOCK_SUPPLIERS = [
    { name: '台灣科技器材有限公司', contact: '陳經理', phone: '02-2345-6789', email: 'chen@techsupply.tw', address: '台北市中山區南京東路三段100號', notes: '' },
    { name: '全球辦公用品股份有限公司', contact: '林副理', phone: '03-456-7890', email: 'lin@globalofficetw.com', address: '桃園市中壢區中央西路二段200號', notes: '' },
    { name: '南方食品原料行', contact: '黃老闆', phone: '06-789-0123', email: 'huang@southfood.tw', address: '台南市東區東門路一段50號', notes: '' },
  ]

  const fillMock = () => {
    const m = MOCK_SUPPLIERS[Math.floor(Math.random() * MOCK_SUPPLIERS.length)]
    reset(m)
  }

  const onSubmit = (data: FormValues) => {
    const payload = { name: data.name, contact: data.contact ?? null, phone: data.phone ?? null, email: data.email ?? null, address: data.address ?? null, notes: data.notes ?? null, credit_limit: data.credit_limit ?? 0 }
    if (editSupplier) updateMutation.mutate({ id: editSupplier.id, data: payload })
    else createMutation.mutate(payload)
  }

  const openEdit = (sup: Supplier) => {
    setEditSupplier(sup)
    reset({ name: sup.name, contact: sup.contact ?? '', phone: sup.phone ?? '', email: sup.email ?? '', address: sup.address ?? '', notes: sup.notes ?? '', credit_limit: sup.credit_limit ?? 0 })
    setFormOpen(true)
  }

  const columns: Column<Supplier>[] = [
    {
      key: '__check__' as keyof Supplier,
      label: '',
      className: 'w-10',
      render: (_v, row) => (
        <Checkbox
          checked={selectedIds.has((row as unknown as Supplier).id)}
          onCheckedChange={() => toggleOne((row as unknown as Supplier).id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      header: () => <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
    },
    { key: 'name', label: s.name, sortable: true, render: (v, row) => (
      <button className="text-left hover:text-primary hover:underline transition-colors" onClick={() => setDetailSupplier(row as unknown as Supplier)}>
        {String(v)}
      </button>
    )},
    { key: 'contact', label: s.contact, sortable: true, hideable: true },
    { key: 'phone', label: s.phone, sortable: true, hideable: true },
    { key: 'email', label: s.email, sortable: true, hideable: true },
    { key: 'address', label: s.address, sortable: true, hideable: true },
    { key: 'credit_limit', label: '信用額度', sortable: true, hideable: true, render: (v) => (Number(v) > 0 ? formatCurrency(Number(v)) : <span className="text-muted-foreground">—</span>) },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <SearchWithHistory
          className="flex-1 max-w-sm"
          placeholder={s.searchPlaceholder}
          value={search}
          onChange={setSearch}
          storageKey="ims-recent-search-suppliers"
        />
        <Button onClick={() => { setEditSupplier(null); reset({ name: '', contact: '', phone: '', email: '', address: '', notes: '', credit_limit: 0 }); setFormOpen(true) }} className="gap-2">
          <Plus className="w-4 h-4" />{s.addSupplier}
        </Button>
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          {(['compact', 'normal', 'relaxed'] as const).map((d, i) => {
            const Icon = [AlignJustify, List, LayoutList][i]
            return (
              <button key={d} title={d} className={`h-9 px-2.5 transition-colors ${density === d ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => { setDensity(d); localStorage.setItem('ims-dt-density-suppliers', d) }}>
                <Icon className="w-4 h-4" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Rule 72: Summary Strip */}
      {!isLoading && (
        <div className="text-xs text-muted-foreground flex items-center gap-4 py-1 px-0.5">
          <span>共 {(suppliers ?? []).length} 位</span>
        </div>
      )}

      {/* A11y Rule 103: Announce search results to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {search ? `找到 ${(suppliers ?? []).length} 筆結果` : ''}
      </div>
      <div className="rounded-lg border border-border bg-card" aria-busy={isLoading} aria-label="供應商列表">
        {isLoading ? <TableSkeleton rows={8} cols={7} /> : (
          <DataTable
            tableLabel="供應商列表"
            data={(suppliers ?? []) as unknown as Record<string, unknown>[]}
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            keyField="id"
            storageKey="suppliers"
            emptyMessage={s.emptyMessage}
            onRowFocus={(row) => setDetailSupplier(row as unknown as Supplier)}
            flashRowId={flashId}
            density={density}
            rowActions={(row) => {
              const supplier = row as unknown as Supplier
              return (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setDetailSupplier(supplier) }}><Eye className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(supplier) }}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: supplier.id as number, snapshot: supplier }) }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </>
              )
            }}
            contextMenu={(row) => {
              const supplier = row as unknown as Supplier
              const items: ContextMenuItem[] = [
                { label: '查看詳情', icon: Eye as LucideIcon, onClick: () => setDetailSupplier(supplier) },
                { label: t.common.edit, icon: Edit2 as LucideIcon, onClick: () => openEdit(supplier) },
                { label: t.common.delete, icon: Trash2 as LucideIcon, variant: 'destructive', separator: true, onClick: () => setPendingDelete({ id: supplier.id as number, snapshot: supplier }) },
              ]
              return items
            }}
          />
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg" aria-modal="true">
          <DialogHeader><DialogTitle>{editSupplier ? `${t.common.edit} ${s.name}` : s.addSupplier}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">{s.name} *</Label>
              <Input id="name" autoComplete="organization" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{s.contact}</Label><Input autoComplete="name" {...register('contact')} /></div>
              <div className="space-y-1.5"><Label>{s.phone}</Label><Input autoComplete="tel" {...register('phone')} /></div>
              <div className="space-y-1.5"><Label>{s.email}</Label><Input type="email" autoComplete="email" {...register('email')} />{errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}</div>
              <div className="space-y-1.5"><Label>{s.address}</Label><Input autoComplete="street-address" {...register('address')} /></div>
              <div className="space-y-1.5">
                <Label>信用額度</Label>
                <Input type="number" min={0} step={1000} placeholder="0 表示不限制" {...register('credit_limit')} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              {!editSupplier && (
                <Button type="button" variant="outline" onClick={fillMock} className="mr-auto gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />Mock 資料
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditSupplier(null) }}>{t.common.cancel}</Button>
              <Button type="submit" disabled={isSubmitting}>{editSupplier ? t.common.save : t.common.add}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)} title={s.deleteTitle} description={s.deleteDesc} onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete)} />
      <SupplierDetailDialog supplier={detailSupplier} open={detailSupplier !== null} onOpenChange={(open) => !open && setDetailSupplier(null)} />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-card border border-border rounded-xl shadow-2xl px-4 py-2.5">
          <span className="text-sm text-muted-foreground">已選 {selectedIds.size} 位</span>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={exportSelected}>
            <Download className="w-3.5 h-3.5" />匯出選取
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5 text-xs h-8" onClick={() => setBatchDeleteOpen(true)}>
            <Trash2 className="w-3.5 h-3.5" />{s.batchDelete}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>{t.common.cancel}</Button>
        </div>
      )}
      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        title={s.batchDeleteTitle(selectedIds.size)}
        description={s.batchDeleteDesc(selectedIds.size)}
        onConfirm={() => batchDeleteMutation.mutate(Array.from(selectedIds))}
      />
    </div>
  )
}
