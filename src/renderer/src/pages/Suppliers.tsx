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
import type { Supplier, SupplierCreate } from '@/types/schema'
import { useLang } from '@/lib/useLang'
import { SupplierDetailDialog } from '@/components/suppliers/SupplierDetailDialog'

const schema = z.object({
  name: z.string().min(1, '供應商名稱必填'),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email 格式不正確').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional()
})
type FormValues = z.infer<typeof schema>

export default function Suppliers() {
  const queryClient = useQueryClient()
  const t = useLang()
  const s = t.suppliers
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => {
    const handler = () => { setEditSupplier(null); reset({ name: '', contact: '', phone: '', email: '', address: '', notes: '' }); setFormOpen(true) }
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); setFormOpen(false); reset() }
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SupplierCreate> }) => window.electronAPI.suppliers.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); setFormOpen(false); setEditSupplier(null); reset() }
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.suppliers.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  })

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
    const payload = { name: data.name, contact: data.contact ?? null, phone: data.phone ?? null, email: data.email ?? null, address: data.address ?? null, notes: data.notes ?? null }
    if (editSupplier) updateMutation.mutate({ id: editSupplier.id, data: payload })
    else createMutation.mutate(payload)
  }

  const openEdit = (sup: Supplier) => {
    setEditSupplier(sup)
    reset({ name: sup.name, contact: sup.contact ?? '', phone: sup.phone ?? '', email: sup.email ?? '', address: sup.address ?? '', notes: sup.notes ?? '' })
    setFormOpen(true)
  }

  const columns: Column<Supplier>[] = [
    { key: 'name', label: s.name, sortable: true, render: (v, row) => (
      <button className="text-left hover:text-primary hover:underline transition-colors" onClick={() => setDetailSupplier(row as unknown as Supplier)}>
        {String(v)}
      </button>
    )},
    { key: 'contact', label: s.contact },
    { key: 'phone', label: s.phone },
    { key: 'email', label: s.email },
    { key: 'address', label: s.address },
    { key: 'id', label: '', className: 'w-28 text-right', render: (_v, row) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setDetailSupplier(row as unknown as Supplier)}><Eye className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row as unknown as Supplier)}><Edit2 className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(row.id as number)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    )}
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={s.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { setEditSupplier(null); reset({ name: '', contact: '', phone: '', email: '', address: '', notes: '' }); setFormOpen(true) }} className="gap-2">
          <Plus className="w-4 h-4" />{s.addSupplier}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? <LoadingSpinner /> : (
          <DataTable data={(suppliers ?? []) as unknown as Record<string, unknown>[]} columns={columns as unknown as Column<Record<string, unknown>>[]} keyField="id" emptyMessage={s.emptyMessage} />
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editSupplier ? `${t.common.edit} ${s.name}` : s.addSupplier}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">{s.name} *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>{s.contact}</Label><Input {...register('contact')} /></div>
              <div className="space-y-1.5"><Label>{s.phone}</Label><Input {...register('phone')} /></div>
              <div className="space-y-1.5"><Label>{s.email}</Label><Input type="email" {...register('email')} />{errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}</div>
              <div className="space-y-1.5"><Label>{s.address}</Label><Input {...register('address')} /></div>
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

      <ConfirmDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)} title={s.deleteTitle} description={s.deleteDesc} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} />
      <SupplierDetailDialog supplier={detailSupplier} open={detailSupplier !== null} onOpenChange={(open) => !open && setDetailSupplier(null)} />
    </div>
  )
}
