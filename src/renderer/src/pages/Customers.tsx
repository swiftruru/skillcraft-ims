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
import type { Customer, CustomerCreate } from '@/types/schema'
import { useLang } from '@/lib/useLang'
import { useSuccessFlash } from '@/lib/useSuccessFlash'
import { formatCurrency } from '@/lib/utils'
import { CustomerDetailDialog } from '@/components/customers/CustomerDetailDialog'
import { useToast } from '@/components/ui/use-toast'

const schema = z.object({
  name: z.string().min(1, '客戶名稱必填'),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  credit_limit: z.coerce.number().min(0).optional()
})
type FormValues = z.infer<typeof schema>

export default function Customers() {
  const queryClient = useQueryClient()
  const t = useLang()
  const c = t.customers
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ id: number; snapshot: Customer } | null>(null)
  const { flashId, triggerFlash } = useSuccessFlash()
  const [density, setDensity] = useState<'compact' | 'normal' | 'relaxed'>(() =>
    (localStorage.getItem('ims-dt-density-customers') as 'compact' | 'normal' | 'relaxed') ?? 'normal'
  )
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)

  useEffect(() => {
    const handler = () => { setEditCustomer(null); reset({ name: '', contact: '', phone: '', email: '', address: '', notes: '', credit_limit: 0 }); setFormOpen(true) }
    window.addEventListener('ims:new-item', handler)
    return () => window.removeEventListener('ims:new-item', handler)
  }, [])

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', 'all', search],
    queryFn: () => window.electronAPI.customers.getAll(search || undefined)
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const createMutation = useMutation({
    mutationFn: (data: CustomerCreate) => window.electronAPI.customers.create(data),
    onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setFormOpen(false); reset(); if (result && typeof result === 'object' && 'id' in result) triggerFlash((result as { id: number }).id) }
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CustomerCreate> }) => window.electronAPI.customers.update(id, data),
    onSuccess: (_r, { id }) => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setFormOpen(false); setEditCustomer(null); reset(); triggerFlash(id) }
  })
  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: number; snapshot: Customer }) => window.electronAPI.customers.delete(id),
    onSuccess: (_data, { snapshot }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      const { dismiss } = toast({
        title: `已刪除「${snapshot.name}」`,
        duration: 5000,
        action: {
          label: '復原',
          onClick: async () => {
            dismiss()
            await window.electronAPI.customers.create({ name: snapshot.name, contact: snapshot.contact, phone: snapshot.phone, email: snapshot.email, address: snapshot.address, notes: snapshot.notes, credit_limit: snapshot.credit_limit })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
          }
        }
      })
    }
  })
  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => window.electronAPI.customers.batchDelete(ids),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setSelectedIds(new Set())
      setBatchDeleteOpen(false)
      toast({ title: `已刪除選取的客戶` })
    }
  })

  const allIds = (customers ?? []).map((cust) => cust.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))
  const toggleAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(allIds))
  const toggleOne = (id: number) => setSelectedIds((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const exportSelected = () => {
    const rows = (customers ?? []).filter((item) => selectedIds.has(item.id))
    const header = '客戶名稱,聯絡人,電話,Email,地址,信用額度,點數餘額'
    const lines = rows.map((item) =>
      [
        `"${item.name}"`, item.contact ?? '', item.phone ?? '',
        item.email ?? '', `"${item.address ?? ''}"`,
        item.credit_limit, item.points_balance
      ].join(',')
    )
    const csv = '\uFEFF' + [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'customers.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const MOCK_CUSTOMERS = [
    { name: '中小型電商公司', contact: '王經理', phone: '02-8765-4321', email: 'wang@ecom.tw', address: '台北市信義區松仁路100號', notes: '' },
    { name: '個人工作室設計師', contact: '李設計師', phone: '0912-345-678', email: 'li@studio.tw', address: '台北市大安區敦化南路二段88號', notes: '' },
    { name: '大型連鎖零售商', contact: '張副總', phone: '03-234-5678', email: 'chang@retail.tw', address: '新竹市東區光復路二段101號', notes: '' },
  ]

  const fillMock = () => {
    const m = MOCK_CUSTOMERS[Math.floor(Math.random() * MOCK_CUSTOMERS.length)]
    reset(m)
  }

  const onSubmit = (data: FormValues) => {
    const payload = { name: data.name, contact: data.contact ?? null, phone: data.phone ?? null, email: data.email ?? null, address: data.address ?? null, notes: data.notes ?? null, credit_limit: data.credit_limit ?? 0 }
    if (editCustomer) updateMutation.mutate({ id: editCustomer.id, data: payload })
    else createMutation.mutate(payload)
  }

  const openEdit = (cust: Customer) => {
    setEditCustomer(cust)
    reset({ name: cust.name, contact: cust.contact ?? '', phone: cust.phone ?? '', email: cust.email ?? '', address: cust.address ?? '', notes: cust.notes ?? '', credit_limit: cust.credit_limit ?? 0 })
    setFormOpen(true)
  }

  const columns: Column<Customer>[] = [
    {
      key: '__check__' as keyof Customer,
      label: '',
      className: 'w-10',
      render: (_v, row) => (
        <Checkbox
          checked={selectedIds.has((row as unknown as Customer).id)}
          onCheckedChange={() => toggleOne((row as unknown as Customer).id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      header: () => <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
    },
    { key: 'name', label: c.name, sortable: true, render: (v, row) => (
      <button className="text-left hover:text-primary hover:underline transition-colors" onClick={() => setDetailCustomer(row as unknown as Customer)}>
        {String(v)}
      </button>
    )},
    { key: 'contact', label: c.contact, sortable: true, hideable: true },
    { key: 'phone', label: c.phone, sortable: true, hideable: true },
    { key: 'email', label: c.email, sortable: true, hideable: true },
    { key: 'address', label: c.address, sortable: true, hideable: true },
    { key: 'credit_limit', label: '信用額度', sortable: true, hideable: true, render: (v) => (Number(v) > 0 ? formatCurrency(Number(v)) : <span className="text-muted-foreground">—</span>) },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <SearchWithHistory
          className="flex-1 max-w-sm"
          placeholder={c.searchPlaceholder}
          value={search}
          onChange={setSearch}
          storageKey="ims-recent-search-customers"
        />
        <Button onClick={() => { setEditCustomer(null); reset({ name: '', contact: '', phone: '', email: '', address: '', notes: '', credit_limit: 0 }); setFormOpen(true) }} className="gap-2">
          <Plus className="w-4 h-4" />{c.addCustomer}
        </Button>
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          {(['compact', 'normal', 'relaxed'] as const).map((d, i) => {
            const Icon = [AlignJustify, List, LayoutList][i]
            return (
              <button key={d} title={d} className={`h-9 px-2.5 transition-colors ${density === d ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => { setDensity(d); localStorage.setItem('ims-dt-density-customers', d) }}>
                <Icon className="w-4 h-4" />
              </button>
            )
          })}
        </div>
      </div>
      {/* Rule 72: Summary Strip */}
      {!isLoading && (
        <div className="text-xs text-muted-foreground flex items-center gap-4 py-1 px-0.5">
          <span>共 {(customers ?? []).length} 位</span>
        </div>
      )}

      {/* A11y Rule 103: Announce search results to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {search ? `找到 ${(customers ?? []).length} 筆結果` : ''}
      </div>
      <div className="rounded-lg border border-border bg-card" aria-busy={isLoading} aria-label="客戶列表">
        {isLoading ? <TableSkeleton rows={8} cols={7} /> : (
          <DataTable
            tableLabel="客戶列表"
            data={(customers ?? []) as unknown as Record<string, unknown>[]}
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            keyField="id"
            storageKey="customers"
            emptyMessage={c.emptyMessage}
            onRowFocus={(row) => setDetailCustomer(row as unknown as Customer)}
            flashRowId={flashId}
            density={density}
            rowActions={(row) => {
              const customer = row as unknown as Customer
              return (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setDetailCustomer(customer) }}><Eye className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(customer) }}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: customer.id as number, snapshot: customer }) }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </>
              )
            }}
            contextMenu={(row) => {
              const customer = row as unknown as Customer
              const items: ContextMenuItem[] = [
                { label: '查看詳情', icon: Eye as LucideIcon, onClick: () => setDetailCustomer(customer) },
                { label: t.common.edit, icon: Edit2 as LucideIcon, onClick: () => openEdit(customer) },
                { label: t.common.delete, icon: Trash2 as LucideIcon, variant: 'destructive', separator: true, onClick: () => setPendingDelete({ id: customer.id as number, snapshot: customer }) },
              ]
              return items
            }}
          />
        )}
      </div>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg" aria-modal="true">
          <DialogHeader><DialogTitle>{editCustomer ? `${t.common.edit} ${c.name}` : c.addCustomer}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5"><Label>{c.name} *</Label><Input autoComplete="organization" {...register('name')} />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{c.contact}</Label><Input autoComplete="name" {...register('contact')} /></div>
              <div className="space-y-1.5"><Label>{c.phone}</Label><Input autoComplete="tel" {...register('phone')} /></div>
              <div className="space-y-1.5"><Label>{c.email}</Label><Input type="email" autoComplete="email" {...register('email')} /></div>
              <div className="space-y-1.5"><Label>{c.address}</Label><Input autoComplete="street-address" {...register('address')} /></div>
              <div className="space-y-1.5">
                <Label>信用額度</Label>
                <Input type="number" min={0} step={1000} placeholder="0 表示不限制" {...register('credit_limit')} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              {!editCustomer && (
                <Button type="button" variant="outline" onClick={fillMock} className="mr-auto gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />Mock 資料
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditCustomer(null) }}>{t.common.cancel}</Button>
              <Button type="submit" disabled={isSubmitting}>{editCustomer ? t.common.save : t.common.add}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)} title={c.deleteTitle} description={c.deleteDesc} onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete)} />
      <CustomerDetailDialog customer={detailCustomer} open={detailCustomer !== null} onOpenChange={(open) => !open && setDetailCustomer(null)} />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-card border border-border rounded-xl shadow-2xl px-4 py-2.5">
          <span className="text-sm text-muted-foreground">已選 {selectedIds.size} 位</span>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={exportSelected}>
            <Download className="w-3.5 h-3.5" />匯出選取
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5 text-xs h-8" onClick={() => setBatchDeleteOpen(true)}>
            <Trash2 className="w-3.5 h-3.5" />{c.batchDelete}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>{t.common.cancel}</Button>
        </div>
      )}
      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        title={c.batchDeleteTitle(selectedIds.size)}
        description={c.batchDeleteDesc(selectedIds.size)}
        onConfirm={() => batchDeleteMutation.mutate(Array.from(selectedIds))}
      />
    </div>
  )
}
