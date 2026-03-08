import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import type { PurchaseSuggestion } from '@/types/schema'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PurchaseSuggestionDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const { data: suggestions, isLoading } = useQuery<PurchaseSuggestion[]>({
    queryKey: ['inventory', 'purchaseSuggestions'],
    queryFn: () => window.electronAPI.inventory.getPurchaseSuggestions(),
    enabled: open,
    staleTime: 0
  })

  const createMutation = useMutation({
    mutationFn: (items: { product_id: number; quantity: number; unit_price: number }[]) =>
      window.electronAPI.inventory.createPurchaseFromSuggestions(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      onOpenChange(false)
      setSelected(new Set())
    }
  })

  const toggleAll = (list: PurchaseSuggestion[]) => {
    if (selected.size === list.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(list.map((s) => s.product_id)))
    }
  }

  const handleCreate = () => {
    if (!suggestions) return
    const items = suggestions
      .filter((s) => selected.has(s.product_id))
      .map((s) => ({ product_id: s.product_id, quantity: s.suggested_qty, unit_price: s.buy_price }))
    createMutation.mutate(items)
  }

  const totalCost = suggestions
    ?.filter((s) => selected.has(s.product_id))
    .reduce((sum, s) => sum + s.estimated_cost, 0) ?? 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSelected(new Set()); onOpenChange(o) }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>採購建議</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            依補貨點計算建議採購量，勾選後一鍵建立採購單
          </p>
        </DialogHeader>

        <div className="mt-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <LoadingSpinner />
          ) : !suggestions || suggestions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">目前無低庫存商品，無需補貨</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === suggestions.length}
                      onChange={() => toggleAll(suggestions)}
                      className="cursor-pointer accent-primary"
                    />
                  </th>
                  <th className="text-left pb-2 pr-3">商品</th>
                  <th className="text-right pb-2 pr-3 w-20">目前庫存</th>
                  <th className="text-right pb-2 pr-3 w-20">補貨點</th>
                  <th className="text-right pb-2 pr-3 w-20">建議採購</th>
                  <th className="text-right pb-2 w-28">預估成本</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {suggestions.map((s) => (
                  <tr
                    key={s.product_id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      const next = new Set(selected)
                      next.has(s.product_id) ? next.delete(s.product_id) : next.add(s.product_id)
                      setSelected(next)
                    }}
                  >
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selected.has(s.product_id)}
                        onChange={() => {}}
                        className="cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{s.sku}</div>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span className={s.stock_qty === 0 ? 'text-destructive font-semibold' : 'text-yellow-400 font-semibold'}>
                        {s.stock_qty}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-muted-foreground">{s.reorder_pt}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{s.suggested_qty}</td>
                    <td className="py-2 text-right">{formatCurrency(s.estimated_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {suggestions && suggestions.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
            <span className="text-muted-foreground">已選 {selected.size} 項</span>
            <span>
              預估總成本：<span className="font-semibold text-foreground">{formatCurrency(totalCost)}</span>
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            disabled={selected.size === 0 || createMutation.isPending}
            onClick={handleCreate}
            className="gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {createMutation.isPending ? '建立中...' : `建立採購單（${selected.size} 項）`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
