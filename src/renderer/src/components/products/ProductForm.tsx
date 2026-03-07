import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '@/lib/constants'
import type { Product } from '@/types/schema'

const schema = z.object({
  sku: z.string().min(1, 'SKU 必填'),
  name: z.string().min(1, '商品名稱必填'),
  category: z.string().min(1, '類別必填'),
  sell_price: z.coerce.number().min(0, '售價不能為負'),
  buy_price: z.coerce.number().min(0, '進價不能為負'),
  stock_qty: z.coerce.number().int().min(0, '庫存不能為負'),
  reorder_pt: z.coerce.number().int().min(0, '補貨點不能為負'),
  unit: z.string().min(1, '單位必填'),
  description: z.string().optional()
})

type FormValues = z.infer<typeof schema>

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
}

export function ProductForm({ open, onOpenChange, product }: ProductFormProps) {
  const queryClient = useQueryClient()
  const isEdit = !!product

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: '',
      name: '',
      category: '電子產品',
      sell_price: 0,
      buy_price: 0,
      stock_qty: 0,
      reorder_pt: 10,
      unit: '個',
      description: ''
    }
  })

  useEffect(() => {
    if (product) {
      reset({
        sku: product.sku,
        name: product.name,
        category: product.category,
        sell_price: product.sell_price,
        buy_price: product.buy_price,
        stock_qty: product.stock_qty,
        reorder_pt: product.reorder_pt,
        unit: product.unit,
        description: product.description ?? ''
      })
    } else {
      reset({
        sku: '',
        name: '',
        category: '電子產品',
        sell_price: 0,
        buy_price: 0,
        stock_qty: 0,
        reorder_pt: 10,
        unit: '個',
        description: ''
      })
    }
  }, [product, reset])

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      isEdit
        ? window.electronAPI.products.update(product!.id, data)
        : window.electronAPI.products.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      onOpenChange(false)
    }
  })

  const onSubmit = (data: FormValues) => mutation.mutate(data)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '編輯商品' : '新增商品'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU *</Label>
              <Input id="sku" {...register('sku')} placeholder="ELEC-001" disabled={isEdit} />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">商品名稱 *</Label>
              <Input id="name" {...register('name')} placeholder="USB-C 充電器 65W" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>類別 *</Label>
              <Select
                value={watch('category')}
                onValueChange={(v) => setValue('category', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>單位 *</Label>
              <Select value={watch('unit')} onValueChange={(v) => setValue('unit', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sell_price">售價 (NT$) *</Label>
              <Input
                id="sell_price"
                type="number"
                {...register('sell_price')}
                min={0}
                step={1}
              />
              {errors.sell_price && <p className="text-xs text-destructive">{errors.sell_price.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buy_price">進價 (NT$) *</Label>
              <Input
                id="buy_price"
                type="number"
                {...register('buy_price')}
                min={0}
                step={1}
              />
              {errors.buy_price && <p className="text-xs text-destructive">{errors.buy_price.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="stock_qty">初始庫存</Label>
              <Input
                id="stock_qty"
                type="number"
                {...register('stock_qty')}
                min={0}
                disabled={isEdit}
              />
              {isEdit && <p className="text-xs text-muted-foreground">庫存由採購/銷售自動更新</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reorder_pt">補貨點</Label>
              <Input
                id="reorder_pt"
                type="number"
                {...register('reorder_pt')}
                min={0}
              />
              <p className="text-xs text-muted-foreground">庫存低於此數量時顯示警示</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">說明</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="商品描述（選填）"
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isEdit ? '更新' : '新增'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
