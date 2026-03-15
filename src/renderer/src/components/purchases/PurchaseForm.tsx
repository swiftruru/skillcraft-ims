
import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Wand2, AlertTriangle, GripVertical } from 'lucide-react'
import { StepperInput } from '@/components/ui/StepperInput'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { CreatableSelect } from '@/components/ui/CreatableSelect'
import type { Product, Supplier } from '@/types/schema'
import { useLang } from '@/lib/useLang'

const schema = z.object({
  supplier_id: z.coerce.number().nullable(),
  order_date: z.string().min(1, '訂單日期必填'),
  payment_terms: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.coerce.number().min(1, '請選擇商品'),
    quantity: z.coerce.number().int().min(1, '數量至少 1'),
    unit_price: z.coerce.number().min(0, '單價不能為負')
  })).min(1, '至少需要一項商品')
})

type FormValues = z.infer<typeof schema>

const DRAFT_KEY = 'ims-draft-purchase'

export function PurchaseForm({ open, onOpenChange, initialData }: { open: boolean; onOpenChange: (v: boolean) => void; initialData?: Partial<FormValues> }) {
  const queryClient = useQueryClient()
  const t = useLang()
  const tf = t.forms
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ['suppliers', 'all'],
    queryFn: () => window.electronAPI.suppliers.getAll()
  })

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products', 'all'],
    queryFn: () => window.electronAPI.products.getAll()
  })

  const today = new Date().toISOString().split('T')[0]

  const {
    register, handleSubmit, control, watch, setValue, reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplier_id: null,
      order_date: today,
      payment_terms: 0,
      notes: '',
      items: [{ product_id: 0, quantity: 1, unit_price: 0 }]
    }
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'items' })
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // Pre-fill when cloning, or restore draft
  useEffect(() => {
    if (open && initialData) {
      reset({
        supplier_id: initialData.supplier_id ?? null,
        order_date: today,
        payment_terms: 0,
        notes: initialData.notes ?? '',
        items: initialData.items?.length ? initialData.items : [{ product_id: 0, quantity: 1, unit_price: 0 }]
      })
      setDraftRestored(false)
    } else if (open && !initialData) {
      try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as FormValues | null
        if (draft) { reset(draft); setDraftRestored(true) }
      } catch { /* ignore */ }
    } else if (!open) {
      reset({ supplier_id: null, order_date: today, payment_terms: 0, notes: '', items: [{ product_id: 0, quantity: 1, unit_price: 0 }] })
      setDraftRestored(false)
    }
  }, [open, initialData])

  // Auto-save draft
  useEffect(() => {
    if (!open || initialData) return
    const subscription = watch((values) => { localStorage.setItem(DRAFT_KEY, JSON.stringify(values)) })
    return () => subscription.unsubscribe()
  }, [open, initialData, watch])

  const handleClose = () => {
    if (isDirty) { setConfirmLeave(true) } else { onOpenChange(false) }
  }

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      const payment_due_date = data.payment_terms && data.payment_terms > 0
        ? new Date(new Date(data.order_date).getTime() + data.payment_terms * 86400000).toISOString().slice(0, 10)
        : null
      return window.electronAPI.purchases.create({ ...data, payment_due_date })
    },
    onSuccess: () => {
      localStorage.removeItem(DRAFT_KEY)
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      reset()
      onOpenChange(false)
    }
  })

  const supplierId = watch('supplier_id')
  const items = watch('items')
  const total = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0)

  const selectedSupplier = suppliers?.find((s) => s.id === Number(supplierId))
  const { data: outstandingData } = useQuery<{ outstanding: number }>({
    queryKey: ['suppliers', 'outstanding', supplierId],
    queryFn: () => window.electronAPI.suppliers.getOutstanding(Number(supplierId)),
    enabled: !!supplierId && (selectedSupplier?.credit_limit ?? 0) > 0
  })
  const creditLimit = selectedSupplier?.credit_limit ?? 0
  const outstanding = outstandingData?.outstanding ?? 0
  const projectedTotal = outstanding + total
  const creditExceeded = creditLimit > 0 && projectedTotal > creditLimit
  const creditNearLimit = creditLimit > 0 && !creditExceeded && projectedTotal >= creditLimit * 0.8

  const fillMock = () => {
    const firstProduct = products?.[0]
    reset({
      supplier_id: suppliers?.[0]?.id ?? null,
      order_date: today,
      payment_terms: 30,
      notes: '測試採購單，請確認品項後送出',
      items: firstProduct
        ? [{ product_id: firstProduct.id, quantity: 10, unit_price: firstProduct.buy_price }]
        : [{ product_id: 0, quantity: 10, unit_price: 100 }]
    })
  }

  const handleProductChange = (index: number, productId: string) => {
    const pid = parseInt(productId)
    setValue(`items.${index}.product_id`, pid)
    const product = products?.find((p) => p.id === pid)
    if (product) {
      setValue(`items.${index}.unit_price`, product.buy_price)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{tf.newPurchaseOrder}</DialogTitle>
            {draftRestored && <span className="text-xs text-muted-foreground">{tf.draftRestored ?? '草稿已還原'}</span>}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5 col-span-1">
              <Label>{tf.supplierLabel}</Label>
              <CreatableSelect
                options={(suppliers ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
                value={watch('supplier_id') != null ? String(watch('supplier_id')) : ''}
                onValueChange={(v) => setValue('supplier_id', v ? parseInt(v) : null, { shouldDirty: true })}
                placeholder={tf.supplierPlaceholder}
                createLabel={(name) => t.creatable.createLabel(name)}
                onCreate={async (name) => {
                  const created = await window.electronAPI.suppliers.create({
                    name, contact: '', phone: '', email: '', address: '', notes: '', credit_limit: 0
                  }) as Supplier
                  queryClient.invalidateQueries({ queryKey: ['suppliers', 'all'] })
                  return String(created.id)
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order_date">{tf.orderDateLabel}</Label>
              <Input id="order_date" type="date" {...register('order_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_terms">{tf.paymentTermsLabel}</Label>
              <Input id="payment_terms" type="number" min={0} step={15} placeholder={tf.paymentTermsPlaceholder} {...register('payment_terms')} />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{tf.itemsLabel}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ product_id: 0, quantity: 1, unit_price: 0 })}
                className="gap-1 h-7 text-xs"
              >
                <Plus className="w-3 h-3" />
                {tf.addItem}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[16px_2fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
                <span></span><span>{tf.productCol}</span><span>{tf.qtyCol}</span><span>{tf.purchasePriceCol}</span><span></span>
              </div>
              {fields.map((field, i) => (
                <div
                  key={field.id}
                  className={`grid grid-cols-[16px_2fr_1fr_1fr_auto] gap-2 items-center transition-opacity ${dragOverIdx === i && dragIdx !== i ? 'ring-1 ring-primary/50 rounded-md' : ''}`}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i) }}
                  onDrop={() => { if (dragIdx !== null && dragIdx !== i) move(dragIdx, i); setDragIdx(null); setDragOverIdx(null) }}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground cursor-grab shrink-0" />
                  <Select onValueChange={(v) => handleProductChange(i, v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={tf.selectProduct} />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          <span className="flex items-center justify-between gap-3 w-full">
                            <span>[{p.sku}] {p.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                              p.stock_qty === 0
                                ? 'bg-red-500/15 text-red-400'
                                : p.stock_qty <= p.reorder_pt
                                  ? 'bg-orange-500/15 text-orange-400'
                                  : 'text-muted-foreground'
                            }`}>
                              {p.stock_qty === 0 ? '缺貨' : `庫存 ${p.stock_qty}`}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <StepperInput
                    value={watch(`items.${i}.quantity`) || 1}
                    onChange={(v) => setValue(`items.${i}.quantity`, v, { shouldDirty: true })}
                    min={1}
                  />
                  <Input type="number" min={0} className="h-9" {...register(`items.${i}.unit_price`)} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive shrink-0"
                    onClick={() => remove(i)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            {errors.items && <p className="text-xs text-destructive">{errors.items.message}</p>}

            <div className="text-right text-sm font-semibold pt-1 border-t border-border">
              合計：NT$ {total.toLocaleString('zh-TW')}
            </div>
          </div>

          {creditExceeded && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>已超過信用額度（上限 NT${creditLimit.toLocaleString('zh-TW')}，目前已用 NT${outstanding.toLocaleString('zh-TW')}），無法建立訂單。</span>
            </div>
          )}
          {creditNearLimit && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>接近信用上限：已用 NT${outstanding.toLocaleString('zh-TW')} + 本單 NT${total.toLocaleString('zh-TW')} = NT${projectedTotal.toLocaleString('zh-TW')}（上限 NT${creditLimit.toLocaleString('zh-TW')}）</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">{tf.notesLabel}</Label>
            <Textarea id="notes" {...register('notes')} rows={2} placeholder={tf.notesPlaceholder} />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={fillMock} className="mr-auto gap-1.5">
              <Wand2 className="w-3.5 h-3.5" />{t.common.mockData}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>{t.common.cancel}</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending || creditExceeded}>{tf.submitCreate}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Unsaved changes confirmation */}
    <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.unsavedChanges.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t.unsavedChanges.desc}</p>
        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={() => setConfirmLeave(false)}>
            {t.unsavedChanges.keepEditing}
          </Button>
          <Button variant="destructive" onClick={() => { setConfirmLeave(false); reset(); onOpenChange(false) }}>
            {t.unsavedChanges.discard}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
