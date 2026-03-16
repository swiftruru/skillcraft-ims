import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { SalesOrder } from '@/types/schema'
import { CheckCircle2, Circle, XCircle, AlertTriangle, BadgeCheck } from 'lucide-react'

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
  const queryClient = useQueryClient()
  const [confirmPaid, setConfirmPaid] = useState(false)

  const { data: order, isLoading } = useQuery<SalesOrder | null>({
    queryKey: ['sales', id],
    queryFn: () => window.electronAPI.sales.getById(id),
    enabled: open
  })

  type HistoryEntry = { id: number; from_status: string | null; to_status: string; changed_at: string; note: string | null }
  const { data: history } = useQuery<HistoryEntry[]>({
    queryKey: ['sales', 'history', id],
    queryFn: () => window.electronAPI.sales.getStatusHistory(id),
    enabled: open,
    staleTime: 1000 * 60
  })

  const markPaidMutation = useMutation({
    mutationFn: () => window.electronAPI.sales.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', id] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setConfirmPaid(false)
    }
  })

  const canMarkPaid = order &&
    (order.status === 'completed' || order.status === 'partial_return') &&
    order.payment_status === 'unpaid'

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
              {(order.status === 'completed' || order.status === 'partial_return') && (() => {
                const today = new Date().toISOString().slice(0, 10)
                const isOverdue = order.payment_status === 'unpaid' && !!order.payment_due_date && order.payment_due_date < today
                return (
                  <>
                    <div>
                      <span className="text-muted-foreground">付款狀態：</span>
                      <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${order.payment_status === 'paid' ? 'bg-green-500/15 text-green-400' : isOverdue ? 'bg-red-500/15 text-red-400' : 'bg-muted text-muted-foreground'}`}>
                        {order.payment_status === 'paid' ? '已付款' : isOverdue ? '逾期未付' : '未付款'}
                      </span>
                    </div>
                    {order.payment_due_date && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">付款期限：</span>
                        <span className={isOverdue ? 'text-red-400 font-medium' : ''}>
                          {formatDate(order.payment_due_date)}
                        </span>
                        {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                    )}
                  </>
                )
              })()}
              {order.notes && <div className="col-span-2"><span className="text-muted-foreground">備註：</span>{order.notes}</div>}
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">商品</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">數量</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">售價</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">折扣</th>
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
                      <td className="text-right px-4 py-2">{item.discount_pct > 0 ? `${item.discount_pct}%` : '—'}</td>
                      <td className="text-right px-4 py-2">{formatCurrency(item.subtotal ?? item.quantity * item.unit_price * (1 - item.discount_pct / 100))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td colSpan={4} className="text-right px-4 py-2 text-muted-foreground">合計</td>
                    <td className="text-right px-4 py-2">{formatCurrency(order.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {history && history.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">狀態紀錄</p>
                <div className="relative pl-7 before:absolute before:left-3 before:top-1 before:bottom-1 before:w-px before:bg-border space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="relative">
                      <span className="absolute -left-4 top-0.5 w-2 h-2 rounded-full bg-border border-2 border-background" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(h.to_status)}`}>{getStatusLabel(h.to_status)}</span>
                        <span className="text-xs text-muted-foreground">{h.changed_at.replace('T', ' ').slice(0, 16)}</span>
                      </div>
                      {h.note && <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : <p className="text-center text-muted-foreground py-8">找不到此銷售單</p>}
        {order && (() => {
          const isCancelled = order.status === 'cancelled'
          const isCompleted = ['completed', 'returned', 'partial_return'].includes(order.status)
          const isReturned = order.status === 'returned'
          const isPartialReturn = order.status === 'partial_return'
          const steps: TimelineStep[] = [
            { label: '建立', date: formatDate(order.created_at), done: true },
            { label: isCancelled ? '已取消' : '完成', date: isCompleted ? formatDate(order.order_date) : null, done: isCompleted, cancelled: isCancelled },
            ...(isReturned ? [{ label: '已退貨', date: null, done: true, cancelled: true }] : []),
            ...(isPartialReturn ? [{ label: '部分退貨', date: null, done: true, cancelled: true }] : [])
          ]
          return <div className="border-t border-border pt-3 mt-1"><OrderTimeline steps={steps} /></div>
        })()}
        {canMarkPaid && (
          <DialogFooter className="border-t border-border pt-4 mt-1">
            <Button
              variant="outline"
              className="gap-2 text-green-400 border-green-500/30 hover:bg-green-500/10 hover:text-green-300"
              onClick={() => setConfirmPaid(true)}
              disabled={markPaidMutation.isPending}
            >
              <BadgeCheck className="w-4 h-4" />
              標記已付款
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
      <ConfirmDialog
        open={confirmPaid}
        onOpenChange={(o) => !o && setConfirmPaid(false)}
        title="確認標記為已付款"
        description="確認將此銷售單標記為已付款？此操作不可撤銷。"
        onConfirm={() => markPaidMutation.mutate()}
        confirmLabel="標記已付款"
        variant="default"
      />
    </Dialog>
  )
}
