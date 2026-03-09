import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import type { Product, Supplier } from '@/types/schema'

interface Props {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickPurchaseDialog({ product, open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const defaultQty = product
    ? Math.max(1, (product.reorder_pt ?? 0) - (product.stock_qty ?? 0))
    : 1

  const [supplierId, setSupplierId] = useState<string>('__none__')
  const [quantity, setQuantity] = useState(defaultQty)
  const [unitPrice, setUnitPrice] = useState(product?.buy_price ?? 0)

  // Reset when product changes
  useEffect(() => {
    if (product) {
      setQuantity(Math.max(1, (product.reorder_pt ?? 0) - (product.stock_qty ?? 0)))
      setUnitPrice(product.buy_price ?? 0)
      setSupplierId('__none__')
    }
  }, [product?.id])

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => window.electronAPI.suppliers.getAll(),
    staleTime: 1000 * 60 * 5,
    enabled: open
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const today = new Date().toISOString().slice(0, 10)
      return window.electronAPI.purchases.create({
        supplier_id: supplierId !== '__none__' ? Number(supplierId) : null,
        order_date: today,
        notes: null,
        items: [{ product_id: product!.id, quantity, unit_price: unitPrice }]
      })
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      toast({ title: `採購單 ${order.order_no} 已建立`, variant: 'success' })
      onOpenChange(false)
    },
    onError: () => toast({ title: '建立失敗，請再試一次', variant: 'destructive' })
  })

  const totalCost = quantity * unitPrice

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>快速採購</DialogTitle>
        </DialogHeader>

        {product && (
          <div className="space-y-4 py-1">
            {/* Product info */}
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm space-y-0.5">
              <p className="font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
              <p className="text-xs text-muted-foreground">
                目前庫存：{product.stock_qty} {product.unit}
                ／補貨點：{product.reorder_pt}
              </p>
            </div>

            {/* Supplier */}
            <div className="space-y-1.5">
              <Label className="text-xs">供應商</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="不指定" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不指定</SelectItem>
                  {(suppliers ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity + Unit price row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">採購數量</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">單價</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between text-sm pt-1 border-t border-border">
              <span className="text-muted-foreground">預估金額</span>
              <span className="font-semibold">{formatCurrency(totalCost)}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !product}
          >
            {createMutation.isPending ? '建立中...' : '建立採購單'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
