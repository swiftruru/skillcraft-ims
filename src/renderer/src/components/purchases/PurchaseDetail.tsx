import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { PurchaseOrder } from '@/types/schema'

export function PurchaseDetail({
  id,
  open,
  onOpenChange
}: {
  id: number
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { data: order, isLoading } = useQuery<PurchaseOrder | null>({
    queryKey: ['purchases', id],
    queryFn: () => window.electronAPI.purchases.getById(id),
    enabled: open
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>採購單詳情</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <LoadingSpinner />
        ) : order ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">訂單號：</span>{order.order_no}</div>
              <div>
                <span className="text-muted-foreground">狀態：</span>
                <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div><span className="text-muted-foreground">供應商：</span>{order.supplier_name ?? '-'}</div>
              <div><span className="text-muted-foreground">訂單日期：</span>{formatDate(order.order_date)}</div>
              {order.receive_date && (
                <div><span className="text-muted-foreground">收貨日期：</span>{formatDate(order.receive_date)}</div>
              )}
              {order.notes && (
                <div className="col-span-2"><span className="text-muted-foreground">備註：</span>{order.notes}</div>
              )}
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">商品</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">數量</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">單價</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">小計</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="px-4 py-2">
                        <div>{item.product_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{item.product_sku}</div>
                      </td>
                      <td className="text-right px-4 py-2">{item.quantity}</td>
                      <td className="text-right px-4 py-2">{formatCurrency(item.unit_price)}</td>
                      <td className="text-right px-4 py-2">{formatCurrency(item.quantity * item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td colSpan={3} className="text-right px-4 py-2 text-muted-foreground">合計</td>
                    <td className="text-right px-4 py-2">{formatCurrency(order.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">找不到此採購單</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
