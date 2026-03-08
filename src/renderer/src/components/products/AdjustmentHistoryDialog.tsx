import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import type { Product, InventoryAdjustment } from '@/types/schema'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

export function AdjustmentHistoryDialog({ open, onOpenChange, product }: Props) {
  const { data: history, isLoading } = useQuery<InventoryAdjustment[]>({
    queryKey: ['products', 'adjustments', product?.id],
    queryFn: () => window.electronAPI.products.getAdjustmentHistory(product!.id),
    enabled: open && product !== null
  })

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>庫存調整記錄</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {product.name}（{product.sku}）· 目前庫存：<span className="font-semibold text-foreground">{product.stock_qty} {product.unit}</span>
          </p>
        </DialogHeader>

        <div className="mt-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <LoadingSpinner />
          ) : !history || history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">尚無調整記錄</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left pb-2 pr-3">時間</th>
                  <th className="text-right pb-2 pr-3 w-16">調整量</th>
                  <th className="text-left pb-2 pr-3">原因</th>
                  <th className="text-left pb-2">備註</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/30">
                    <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                      {record.adjusted_at.replace('T', ' ').slice(0, 16)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono font-semibold">
                      <span className={`inline-flex items-center gap-0.5 ${record.delta > 0 ? 'text-green-400' : 'text-destructive'}`}>
                        {record.delta > 0
                          ? <ArrowUp className="w-3 h-3" />
                          : <ArrowDown className="w-3 h-3" />
                        }
                        {record.delta > 0 ? `+${record.delta}` : record.delta}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs">{record.reason}</td>
                    <td className="py-2 text-xs text-muted-foreground">{record.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
