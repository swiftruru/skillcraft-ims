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
import { Badge } from '@/components/ui/badge'
import { SalesOrder } from '@/types/schema'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: SalesOrder | null
  onSuccess: () => void
}

export function PartialReturnDialog({ open, onOpenChange, order, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({})

  const items = order?.items ?? []

  function handleQtyChange(itemId: number, value: string) {
    const n = parseInt(value, 10)
    setReturnQtys(prev => ({ ...prev, [itemId]: isNaN(n) ? 0 : n }))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!order) return
      const payload = items
        .map(item => ({ itemId: item.id, returnQty: returnQtys[item.id] ?? 0 }))
        .filter(p => p.returnQty > 0)
      if (payload.length === 0) throw new Error('請至少填入一個退貨數量')
      const result = await window.electronAPI.sales.partialReturn(order.id, payload)
      if (!result.success) throw new Error(result.error ?? '退貨失敗')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      setReturnQtys({})
      onSuccess()
      onOpenChange(false)
    }
  })

  function handleClose() {
    setReturnQtys({})
    mutation.reset()
    onOpenChange(false)
  }

  const hasAnyQty = items.some(item => (returnQtys[item.id] ?? 0) > 0)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>部分退貨 — {order?.order_no}</DialogTitle>
        </DialogHeader>

        <div className="overflow-auto max-h-[400px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left py-2 pr-3">商品</th>
                <th className="text-center py-2 px-2">訂購數量</th>
                <th className="text-center py-2 px-2">已退數量</th>
                <th className="text-center py-2 px-2">可退數量</th>
                <th className="text-center py-2 pl-2">本次退貨</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const alreadyReturned = item.return_qty ?? 0
                const canReturn = item.quantity - alreadyReturned
                const currentQty = returnQtys[item.id] ?? 0

                return (
                  <tr key={item.id} className="border-b border-slate-800">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-slate-200">{item.product_name}</div>
                      <div className="text-xs text-slate-500">{item.product_sku}</div>
                    </td>
                    <td className="text-center py-2 px-2 text-slate-300">{item.quantity}</td>
                    <td className="text-center py-2 px-2">
                      {alreadyReturned > 0 ? (
                        <Badge variant="outline" className="text-amber-400 border-amber-400/40">
                          {alreadyReturned}
                        </Badge>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="text-center py-2 px-2 text-slate-300">{canReturn}</td>
                    <td className="text-center py-2 pl-2">
                      {canReturn > 0 ? (
                        <Input
                          type="number"
                          min={0}
                          max={canReturn}
                          value={currentQty === 0 ? '' : currentQty}
                          onChange={e => handleQtyChange(item.id, e.target.value)}
                          className="w-20 text-center mx-auto"
                          placeholder="0"
                        />
                      ) : (
                        <span className="text-slate-500 text-xs">已全退</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {mutation.error && (
          <p className="text-sm text-red-400 mt-1">{(mutation.error as Error).message}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            取消
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!hasAnyQty || mutation.isPending}
            className="bg-amber-600 hover:bg-amber-500 text-white"
          >
            {mutation.isPending ? '處理中…' : '確認退貨'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
