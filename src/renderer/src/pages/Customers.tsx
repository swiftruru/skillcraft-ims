import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, Wand2, Eye } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Customer, CustomerCreate } from '@/types/schema'
import { useLang } from '@/lib/useLang'
import { CustomerDetailDialog } from '@/components/customers/CustomerDetailDialog'

const schema = z.object({
  name: z.string().min(1, '客戶名稱必填'),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional()
})
type FormValues = z.infer<typeof schema>

export default function Customers() {
  const queryClient = useQueryClient()
  const t = useLang()
  const c = t.customers
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => {
    const handler = () => { setEditCustomer(null); reset({ name: '', contact: '', phone: '', email: '', address: '', notes: '' }); setFormOpen(true) }
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setFormOpen(false); reset() }
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CustomerCreate> }) => window.electronAPI.customers.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setFormOpen(false); setEditCustomer(null); reset() }
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.customers.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] })
  })

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
    const payload = { name: data.name, contact: data.contact ?? null, phone: data.phone ?? null, email: data.email ?? null, address: data.address ?? null, notes: data.notes ?? null }
    if (editCustomer) updateMutation.mutate({ id: editCustomer.id, data: payload })
    else createMutation.mutate(payload)
  }

  const openEdit = (cust: Customer) => {
    setEditCustomer(cust)
    reset({ name: cust.name, contact: cust.contact ?? '', phone: cust.phone ?? '', email: cust.email ?? '', address: cust.address ?? '', notes: cust.notes ?? '' })
    setFormOpen(true)
  }

  const columns: Column<Customer>[] = [
    { key: 'name', label: c.name, sortable: true, render: (v, row) => (
      <button className="text-left hover:text-primary hover:underline transition-colors" onClick={() => setDetailCustomer(row as unknown as Customer)}>
        {String(v)}
      </button>
    )},
    { key: 'contact', label: c.contact },
    { key: 'phone', label: c.phone },
    { key: 'email', label: c.email },
    { key: 'address', label: c.address },
    { key: 'id', label: '', className: 'w-28 text-right', render: (_v, row) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setDetailCustomer(row as unknown as Customer)}><Eye className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row as unknown as Customer)}><Edit2 className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(row.id as number)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    )}
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={c.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { setEditCustomer(null); reset({ name: '', contact: '', phone: '', email: '', address: '', notes: '' }); setFormOpen(true) }} className="gap-2">
          <Plus className="w-4 h-4" />{c.addCustomer}
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-card">
        {isLoading ? <LoadingSpinner /> : (
          <DataTable data={(customers ?? []) as unknown as Record<string, unknown>[]} columns={columns as unknown as Column<Record<string, unknown>>[]} keyField="id" emptyMessage={c.emptyMessage} />
        )}
      </div>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editCustomer ? `${t.common.edit} ${c.name}` : c.addCustomer}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5"><Label>{c.name} *</Label><Input {...register('name')} />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{c.contact}</Label><Input {...register('contact')} /></div>
              <div className="space-y-1.5"><Label>{c.phone}</Label><Input {...register('phone')} /></div>
              <div className="space-y-1.5"><Label>{c.email}</Label><Input type="email" {...register('email')} /></div>
              <div className="space-y-1.5"><Label>{c.address}</Label><Input {...register('address')} /></div>
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
      <ConfirmDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)} title={c.deleteTitle} description={c.deleteDesc} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} />
      <CustomerDetailDialog customer={detailCustomer} open={detailCustomer !== null} onOpenChange={(open) => !open && setDetailCustomer(null)} />
    </div>
  )
}
