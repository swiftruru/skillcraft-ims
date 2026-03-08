import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MinusCircle, PlusCircle } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { Product } from '@/types/schema'

const REASONS = [
  '盤點修正',
  '損耗報廢',
  '樣品出貨',
  '退貨入庫',
  '系統校正',
  '其他'
]

const schema = z.object({
  direction: z.enum(['in', 'out']),
  quantity: z.coerce.number().int().min(1, '數量至少為 1'),
  reason: z.string().min(1, '請選擇原因'),
  note: z.string().optional()
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

export function AdjustInventoryDialog({ open, onOpenChange, product }: Props) {
  const queryClient = useQueryClient()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { direction: 'in', quantity: 1, reason: '', note: '' }
  })

  const direction = watch('direction')

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const delta = data.direction === 'in' ? data.quantity : -data.quantity
      return window.electronAPI.products.adjust(product!.id, delta, data.reason, data.note || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      reset()
      onOpenChange(false)
    }
  })

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>庫存調整</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {product.name}（{product.sku}）· 目前庫存：<span className="font-semibold text-foreground">{product.stock_qty} {product.unit}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 py-2">
          {/* Direction */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setValue('direction', 'in')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                direction === 'in'
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : 'border-border text-muted-foreground hover:border-border/80'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              入庫 / 增加
            </button>
            <button
              type="button"
              onClick={() => setValue('direction', 'out')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                direction === 'out'
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-border text-muted-foreground hover:border-border/80'
              }`}
            >
              <MinusCircle className="w-4 h-4" />
              出庫 / 減少
            </button>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label>調整數量</Label>
            <Input
              type="number"
              min={1}
              {...register('quantity')}
              placeholder="請輸入數量"
            />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            {direction === 'out' && (
              <p className="text-xs text-muted-foreground">
                調整後庫存：{Math.max(0, product.stock_qty - (watch('quantity') || 0))} {product.unit}
              </p>
            )}
            {direction === 'in' && (
              <p className="text-xs text-muted-foreground">
                調整後庫存：{product.stock_qty + (watch('quantity') || 0)} {product.unit}
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>調整原因</Label>
            <Select value={watch('reason')} onValueChange={(v) => setValue('reason', v)}>
              <SelectTrigger>
                <SelectValue placeholder="選擇原因" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>備註（選填）</Label>
            <Input {...register('note')} placeholder="補充說明..." />
          </div>

          {mutation.error && (
            <p className="text-sm text-destructive">
              {(mutation.error as Error).message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
              取消
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              variant={direction === 'out' ? 'destructive' : 'default'}
            >
              {mutation.isPending ? '處理中...' : '確認調整'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
