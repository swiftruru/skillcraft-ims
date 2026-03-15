import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, AlertTriangle, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { UnpaidOrder } from '@/types/schema'
import { useLang } from '@/lib/useLang'

type Tab = 'sales' | 'purchases'

export default function Receivables() {
  const t = useLang()
  const r = t.receivables
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('sales')
  const [markPaid, setMarkPaid] = useState<{ id: number; type: Tab } | null>(null)
  const [overdueFilter, setOverdueFilter] = useState(false)

  type SortKey = 'order_no' | 'party_name' | 'order_date' | 'payment_due_date' | 'total_amount'
  type SortDir = 'asc' | 'desc'
  const [sortKey, setSortKey] = useState<SortKey>('payment_due_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const { data, isLoading } = useQuery<{ sales: UnpaidOrder[]; purchases: UnpaidOrder[] }>({
    queryKey: ['reports', 'unpaidOrders'],
    queryFn: () => window.electronAPI.reports.getUnpaidOrders(),
    staleTime: 1000 * 30
  })

  const salesMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.sales.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    }
  })

  const purchasesMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.purchases.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
    }
  })

  const handleConfirmPaid = () => {
    if (!markPaid) return
    if (markPaid.type === 'sales') {
      salesMutation.mutate(markPaid.id)
    } else {
      purchasesMutation.mutate(markPaid.id)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const orders = tab === 'sales' ? (data?.sales ?? []) : (data?.purchases ?? [])
  const overdueCount = orders.filter((o) => o.overdue).length
  const totalAmount = orders.reduce((s, o) => s + o.total_amount, 0)
  const filteredOrders = overdueFilter ? orders.filter((o) => o.overdue) : orders

  const displayedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let av: string | number = a[sortKey] ?? ''
      let bv: string | number = b[sortKey] ?? ''
      // nulls last for payment_due_date
      if (sortKey === 'payment_due_date') {
        if (!av && !bv) return 0
        if (!av) return 1
        if (!bv) return -1
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      av = String(av); bv = String(bv)
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredOrders, sortKey, sortDir])

  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const getDaysOverdue = (dueDate: string | null): number => {
    if (!dueDate) return 0
    return Math.floor((new Date(today).getTime() - new Date(dueDate).getTime()) / 86400000)
  }

  const isDueSoon = (order: UnpaidOrder): boolean =>
    !order.overdue && !!order.payment_due_date && order.payment_due_date > today && order.payment_due_date <= in7Days

  const agingBuckets = {
    current: orders.filter((o) => !o.overdue),
    d1to30: orders.filter((o) => o.overdue && getDaysOverdue(o.payment_due_date) <= 30),
    d31to60: orders.filter((o) => o.overdue && getDaysOverdue(o.payment_due_date) > 30 && getDaysOverdue(o.payment_due_date) <= 60),
    over60: orders.filter((o) => o.overdue && getDaysOverdue(o.payment_due_date) > 60)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sales', label: r.salesTab },
    { key: 'purchases', label: r.purchasesTab }
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{r.title}</h1>
          {orders.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {r.summary(orders.length, totalAmount)}
              {overdueCount > 0 && (
                <button
                  className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer
                    ${overdueFilter
                      ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                      : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                  onClick={() => setOverdueFilter((v) => !v)}
                  title={overdueFilter ? '點擊顯示全部' : '點擊只顯示逾期'}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {r.overdueCount(overdueCount)}
                </button>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => { setTab(tb.key); setOverdueFilter(false) }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === tb.key
                ? 'bg-card text-foreground font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tb.label}
            {tb.key === 'sales' && (data?.sales ?? []).length > 0 && (
              <span className="ml-1.5 text-xs bg-primary/15 text-primary rounded-full px-1.5 py-0.5">
                {data!.sales.length}
              </span>
            )}
            {tb.key === 'purchases' && (data?.purchases ?? []).length > 0 && (
              <span className="ml-1.5 text-xs bg-primary/15 text-primary rounded-full px-1.5 py-0.5">
                {data!.purchases.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Aging Analysis */}
      {orders.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">{r.agingTitle}</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: r.agingCurrent, items: agingBuckets.current, color: 'text-green-400', bg: 'bg-green-500/5 border-green-500/20' },
              { label: r.aging1to30, items: agingBuckets.d1to30, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' },
              { label: r.aging31to60, items: agingBuckets.d31to60, color: 'text-orange-400', bg: 'bg-orange-500/5 border-orange-500/20' },
              { label: r.agingOver60, items: agingBuckets.over60, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/20' }
            ].map((bucket) => (
              <div key={bucket.label} className={`rounded-lg border p-3 ${bucket.bg}`}>
                <div className="text-xs text-muted-foreground">{bucket.label}</div>
                <div className={`text-lg font-bold mt-1 ${bucket.items.length > 0 ? bucket.color : 'text-muted-foreground'}`}>
                  {formatCurrency(bucket.items.reduce((s, o) => s + o.total_amount, 0))}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{bucket.items.length} 筆</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">{t.common.loading}</div>
        ) : displayedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground gap-2">
            <span className="text-2xl">🎉</span>
            <span>{r.emptyMessage}</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">{tab === 'sales' ? '應收帳款－銷售訂單' : '應付帳款－採購訂單'}</caption>
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                {(
                  [
                    { key: 'order_no' as SortKey, label: r.orderNo, align: 'left' },
                    { key: 'party_name' as SortKey, label: tab === 'sales' ? r.customer : r.supplier, align: 'left' },
                    { key: 'order_date' as SortKey, label: r.orderDate, align: 'left' },
                    { key: 'payment_due_date' as SortKey, label: r.paymentDue, align: 'left' },
                    { key: 'total_amount' as SortKey, label: r.amount, align: 'right' },
                  ] as { key: SortKey; label: string; align: 'left' | 'right' }[]
                ).map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`px-4 py-3 font-medium ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                    >
                      {col.label}
                      <span className="opacity-50" aria-hidden="true">
                        {sortKey === col.key
                          ? sortDir === 'asc'
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />
                          : <ChevronsUpDown className="w-3 h-3" />
                        }
                      </span>
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 w-20" aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {displayedOrders.map((order) => {
                const isOverdue = !!order.overdue
                const isSoon = isDueSoon(order)
                return (
                  <tr
                    key={order.id}
                    className={`border-b border-border/50 last:border-0 hover:bg-muted/30 ${isOverdue ? 'bg-red-500/5' : isSoon ? 'bg-amber-500/5' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{order.order_no}</td>
                    <td className="px-4 py-3">{order.party_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(order.order_date)}</td>
                    <td className="px-4 py-3">
                      {order.payment_due_date ? (
                        <span className={isOverdue ? 'text-red-400 font-medium' : isSoon || order.payment_due_date === today ? 'text-amber-400 font-medium' : ''}>
                          {formatDate(order.payment_due_date)}
                          {isOverdue && (
                            <span className="ml-1.5 text-xs bg-red-500/15 text-red-400 rounded-full px-1.5 py-0.5">{r.overdue}</span>
                          )}
                          {!isOverdue && order.payment_due_date === today && (
                            <span className="ml-1.5 text-xs bg-amber-500/15 text-amber-400 rounded-full px-1.5 py-0.5">{r.dueToday}</span>
                          )}
                          {isSoon && order.payment_due_date !== today && (
                            <span className="ml-1.5 text-xs bg-amber-500/15 text-amber-400 rounded-full px-1.5 py-0.5">{r.dueSoon}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(order.total_amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-400 hover:text-green-500"
                        title={r.markPaid}
                        onClick={() => setMarkPaid({ id: order.id, type: tab })}
                      >
                        <BadgeCheck className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30">
                <td colSpan={4} className="px-4 py-2.5 text-xs text-muted-foreground">{r.total(orders.length)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-sm">{formatCurrency(totalAmount)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={markPaid !== null}
        onOpenChange={(open) => !open && setMarkPaid(null)}
        title={r.markPaidTitle}
        description={r.markPaidDesc}
        onConfirm={handleConfirmPaid}
        confirmLabel={r.markPaid}
        variant="default"
      />
    </div>
  )
}
