import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Product, Customer } from '@/types/schema'

const schema = z.object({
  customer_id: z.coerce.number().nullable(),
  order_date: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.coerce.number().min(1, '請選擇商品'),
    quantity: z.coerce.number().int().min(1),
    unit_price: z.coerce.number().min(0)
  })).min(1, '至少需要一項商品')
})

type FormValues = z.infer<typeof schema>

export function SaleForm({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient()
  const { data: customers } = useQuery<Customer[]>({ queryKey: ['customers', 'all'], queryFn: () => window.electronAPI.customers.getAll() })
  const { data: products } = useQuery<Product[]>({ queryKey: ['products', 'all'], queryFn: () => window.electronAPI.products.getAll() })
  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customer_id: null, order_date: today, notes: '', items: [{ product_id: 0, quantity: 1, unit_price: 0 }] }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const mutation = useMutation({
    mutationFn: (data: FormValues) => window.electronAPI.sales.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sales'] }); reset(); onOpenChange(false) }
  })

  const items = watch('items')
  const total = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0)

  const handleProductChange = (index: number, productId: string) => {
    const pid = parseInt(productId)
    setValue(`items.${index}.product_id`, pid)
    const p = products?.find((p) => p.id === pid)
    if (p) setValue(`items.${index}.unit_price`, p.sell_price)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>新增銷售單</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>客戶</Label>
              <Select onValueChange={(v) => setValue('customer_id', v === 'null' ? null : parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="選擇客戶（選填）" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">一般客戶</SelectItem>
                  {customers?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order_date">訂單日期 *</Label>
              <Input id="order_date" type="date" {...register('order_date')} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>銷售明細</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ product_id: 0, quantity: 1, unit_price: 0 })} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" />新增品項
              </Button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
                <span>商品</span><span>數量</span><span>售價 (NT$)</span><span></span>
              </div>
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
                  <Select onValueChange={(v) => handleProductChange(i, v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="選擇商品" /></SelectTrigger>
                    <SelectContent>
                      {products?.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          [{p.sku}] {p.name} (庫存:{p.stock_qty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min={1} className="h-9" {...register(`items.${i}.quantity`)} />
                  <Input type="number" min={0} className="h-9" {...register(`items.${i}.unit_price`)} />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => remove(i)} disabled={fields.length === 1}>
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

          <div className="space-y-1.5">
            <Label htmlFor="notes">備註</Label>
            <Textarea id="notes" {...register('notes')} rows={2} placeholder="備註（選填）" />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>建立銷售單</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
