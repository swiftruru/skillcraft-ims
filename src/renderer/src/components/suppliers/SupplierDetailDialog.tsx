import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { Supplier, PurchaseOrder } from '@/types/schema'

interface Props {
  supplier: Supplier | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SupplierDetailDialog({ supplier, open, onOpenChange }: Props) {
  const { data: orders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['suppliers', 'orders', supplier?.id],
    queryFn: () => window.electronAPI.suppliers.getOrders(supplier!.id),
    enabled: open && supplier !== null,
    staleTime: 1000 * 60
  })

  const receivedOrders = (orders ?? []).filter((o) => o.status === 'received' || o.status === 'returned')
  const totalAmount = receivedOrders.reduce((sum, o) => sum + o.total_amount, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{supplier?.name}</DialogTitle>
        </DialogHeader>

        {/* Contact info */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm pb-4 border-b border-border">
          {supplier?.contact && (
            <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">聯絡人</span><span>{supplier.contact}</span></div>
          )}
          {supplier?.phone && (
            <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">電話</span><span>{supplier.phone}</span></div>
          )}
          {supplier?.email && (
            <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">Email</span><span>{supplier.email}</span></div>
          )}
          {supplier?.address && (
            <div className="flex gap-2 col-span-2"><span className="text-muted-foreground w-16 shrink-0">地址</span><span>{supplier.address}</span></div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 py-3 border-b border-border">
          <div className="text-center">
            <div className="text-xl font-bold">{(orders ?? []).length}</div>
            <div className="text-xs text-muted-foreground">訂單總數</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">{receivedOrders.length}</div>
            <div className="text-xs text-muted-foreground">已收貨</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">{formatCurrency(totalAmount)}</div>
            <div className="text-xs text-muted-foreground">累計採購</div>
          </div>
        </div>

        {/* Order list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <LoadingSpinner />
          ) : (orders ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">尚無採購記錄</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-2 font-medium">訂單號</th>
                  <th className="text-left py-2 font-medium">日期</th>
                  <th className="text-left py-2 font-medium">狀態</th>
                  <th className="text-right py-2 font-medium">金額</th>
                </tr>
              </thead>
              <tbody>
                {(orders ?? []).map((order) => (
                  <tr key={order.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="py-2 font-mono text-xs">{order.order_no}</td>
                    <td className="py-2">{formatDate(order.order_date)}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="py-2 text-right">{formatCurrency(order.total_amount)}</td>
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
