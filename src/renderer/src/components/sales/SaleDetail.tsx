import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { SalesOrder } from '@/types/schema'
import { CheckCircle2, Circle, XCircle } from 'lucide-react'

interface TimelineStep { label: string; date: string | null; done: boolean; cancelled?: boolean }

function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex items-start gap-0 pt-3 pb-1">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center flex-1 min-w-0">
          <div className="flex flex-col items-center shrink-0">
            {step.cancelled
              ? <XCircle className="w-4 h-4 text-destructive" />
              : step.done
                ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                : <Circle className="w-4 h-4 text-muted-foreground/40" />
            }
            <span className={`text-xs mt-1 whitespace-nowrap ${step.cancelled ? 'text-destructive' : step.done ? 'text-foreground' : 'text-muted-foreground/50'}`}>
              {step.label}
            </span>
            {step.date && <span className="text-[10px] text-muted-foreground mt-0.5">{step.date}</span>}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 mx-1 mb-5 ${steps[i + 1].done || steps[i + 1].cancelled ? 'bg-green-500/50' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export function SaleDetail({ id, open, onOpenChange }: { id: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: order, isLoading } = useQuery<SalesOrder | null>({
    queryKey: ['sales', id],
    queryFn: () => window.electronAPI.sales.getById(id),
    enabled: open
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>銷售單詳情</DialogTitle></DialogHeader>
        {isLoading ? <LoadingSpinner /> : order ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">訂單號：</span>{order.order_no}</div>
              <div>
                <span className="text-muted-foreground">狀態：</span>
                <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div><span className="text-muted-foreground">客戶：</span>{(order as { customer_name?: string }).customer_name ?? '一般客戶'}</div>
              <div><span className="text-muted-foreground">訂單日期：</span>{formatDate(order.order_date)}</div>
              {order.notes && <div className="col-span-2"><span className="text-muted-foreground">備註：</span>{order.notes}</div>}
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">商品</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">數量</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">售價</th>
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
        ) : <p className="text-center text-muted-foreground py-8">找不到此銷售單</p>}
        {order && (() => {
          const isCancelled = order.status === 'cancelled'
          const isCompleted = order.status === 'completed' || order.status === 'returned'
          const isReturned = order.status === 'returned'
          const steps: TimelineStep[] = [
            { label: '建立', date: formatDate(order.created_at), done: true },
            { label: isCancelled ? '已取消' : '完成', date: isCompleted ? formatDate(order.order_date) : null, done: isCompleted, cancelled: isCancelled },
            ...(isReturned ? [{ label: '已退貨', date: null, done: true, cancelled: true }] : [])
          ]
          return <div className="border-t border-border pt-3 mt-1"><OrderTimeline steps={steps} /></div>
        })()}
      </DialogContent>
    </Dialog>
  )
}
