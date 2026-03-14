import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/schema'
import { useLang } from '@/lib/useLang'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: number[]
  products: Product[]
  onSuccess: () => void
}

type Mode = 'set' | 'increase' | 'decrease'
type Target = 'sell_price' | 'buy_price' | 'both'
type AmountType = 'fixed' | 'percent'

export function BatchPriceDialog({ open, onOpenChange, selectedIds, products, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useLang()
  const p = t.products

  const [mode, setMode] = useState<Mode>('increase')
  const [target, setTarget] = useState<Target>('sell_price')
  const [amountType, setAmountType] = useState<AmountType>('percent')
  const [amount, setAmount] = useState('')

  const selectedProducts = products.filter((pr) => selectedIds.includes(pr.id))

  const previewPrice = (product: Product, col: 'sell_price' | 'buy_price') => {
    const original = col === 'sell_price' ? product.sell_price : product.buy_price
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) return null
    let result: number
    if (mode === 'set') {
      result = amountType === 'fixed' ? val : (original * val) / 100
    } else {
      const delta = amountType === 'fixed' ? val : (original * val) / 100
      result = mode === 'increase' ? original + delta : Math.max(0, original - delta)
    }
    return Math.round(result * 100) / 100
  }

  const mutation = useMutation({
    mutationFn: () =>
      window.electronAPI.products.batchUpdatePrice(
        selectedIds,
        mode,
        target,
        parseFloat(amount),
        amountType
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({ title: `已更新 ${res.updated} 項商品價格`, variant: 'success' })
      onSuccess()
      onOpenChange(false)
      setAmount('')
    },
    onError: () => toast({ title: '更新失敗', variant: 'destructive' })
  })

  const handleSubmit = () => {
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) return
    mutation.mutate()
  }

  const modeLabel = { set: '設定為', increase: '調漲', decrease: '調降' }
  const targetLabel = { sell_price: '售價', buy_price: '進價', both: '售價 + 進價' }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{p.adjustPrice}（已選 {selectedIds.length} 項）</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{p.priceAdjustMode}</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">調漲</SelectItem>
                  <SelectItem value="decrease">調降</SelectItem>
                  <SelectItem value="set">設定為</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{p.priceAdjustTarget}</Label>
              <Select value={target} onValueChange={(v) => setTarget(v as Target)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell_price">售價</SelectItem>
                  <SelectItem value="buy_price">進價</SelectItem>
                  <SelectItem value="both">售價 + 進價</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{p.priceAdjustType}</Label>
              <Select value={amountType} onValueChange={(v) => setAmountType(v as AmountType)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">百分比 (%)</SelectItem>
                  <SelectItem value="fixed">固定金額</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{p.priceAdjustAmount}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-9 pr-8 text-sm"
                  placeholder={amountType === 'percent' ? '例：10' : '例：50'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {amountType === 'percent' ? '%' : '$'}
                </span>
              </div>
            </div>
          </div>

          {/* Preview table */}
          {selectedProducts.length > 0 && parseFloat(amount) > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs text-muted-foreground bg-muted/30 px-3 py-2">
                <span>商品名稱</span>
                {(target === 'sell_price' || target === 'both') && <span className="text-right">售價</span>}
                {(target === 'buy_price' || target === 'both') && <span className="text-right">進價</span>}
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
                {selectedProducts.slice(0, 10).map((pr) => (
                  <div key={pr.id} className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-2 text-xs items-center">
                    <span className="truncate text-foreground">{pr.name}</span>
                    {(target === 'sell_price' || target === 'both') && (
                      <span className="text-right tabular-nums">
                        <span className="text-muted-foreground line-through mr-1">{formatCurrency(pr.sell_price)}</span>
                        <span className="text-green-400 font-medium">{formatCurrency(previewPrice(pr, 'sell_price') ?? pr.sell_price)}</span>
                      </span>
                    )}
                    {(target === 'buy_price' || target === 'both') && (
                      <span className="text-right tabular-nums">
                        <span className="text-muted-foreground line-through mr-1">{formatCurrency(pr.buy_price)}</span>
                        <span className="text-blue-400 font-medium">{formatCurrency(previewPrice(pr, 'buy_price') ?? pr.buy_price)}</span>
                      </span>
                    )}
                  </div>
                ))}
                {selectedProducts.length > 10 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">…等共 {selectedProducts.length} 項</div>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            將對 <span className="font-semibold text-foreground">{selectedIds.length}</span> 項商品的 <span className="font-semibold text-foreground">{targetLabel[target]}</span>
            {' '}{modeLabel[mode]} {amount || '?'}{amountType === 'percent' ? '%' : ' 元'}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0 || mutation.isPending}
          >
            {mutation.isPending ? '更新中...' : p.adjustPrice}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
