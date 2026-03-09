import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface ReceivePurchaseDialogProps {
  orderId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (id: number) => void
}

export function ReceivePurchaseDialog({ orderId, open, onOpenChange, onConfirm }: ReceivePurchaseDialogProps) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['purchases', 'detail', orderId],
    queryFn: () => window.electronAPI.purchases.getById(orderId!),
    enabled: orderId !== null && open
  })

  const [actualQtys, setActualQtys] = useState<Record<number, number>>({})

  useEffect(() => {
    if (order?.items) {
      const init: Record<number, number> = {}
      for (const item of order.items) {
        init[item.product_id] = item.quantity
      }
      setActualQtys(init)
    }
  }, [order])

  const handleConfirm = () => {
    if (!orderId) return
    onConfirm(orderId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>確認收貨品項</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              請確認以下品項數量，確認後庫存將自動更新。
            </p>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">商品</th>
                    <th className="px-3 py-2 text-right font-medium w-24">訂購數量</th>
                    <th className="px-3 py-2 text-right font-medium w-28">實際收貨</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(order?.items ?? []).map((item) => (
                    <tr key={item.product_id}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">{item.product_sku}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          className="h-7 text-right text-sm w-full"
                          value={actualQtys[item.product_id] ?? item.quantity}
                          onChange={(e) =>
                            setActualQtys((prev) => ({
                              ...prev,
                              [item.product_id]: Math.max(0, Number(e.target.value))
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleConfirm} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
            確認收貨
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
