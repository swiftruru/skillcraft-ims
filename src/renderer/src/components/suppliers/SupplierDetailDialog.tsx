import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { Supplier, PurchaseOrder } from '@/types/schema'

function CreditBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100)
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>已用 {formatCurrency(used)}</span>
        <span>上限 {formatCurrency(limit)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

interface Props {
  supplier: Supplier | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function startOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function SupplierDetailDialog({ supplier, open, onOpenChange }: Props) {
  const [activeTab, setActiveTab] = useState<'orders' | 'statement'>('orders')
  const [dateFrom, setDateFrom] = useState(startOfMonth)
  const [dateTo, setDateTo] = useState(today)

  const { data: orders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['suppliers', 'orders', supplier?.id],
    queryFn: () => window.electronAPI.suppliers.getOrders(supplier!.id),
    enabled: open && supplier !== null,
    staleTime: 1000 * 60
  })

  const { data: outstandingData } = useQuery<{ outstanding: number }>({
    queryKey: ['suppliers', 'outstanding', supplier?.id],
    queryFn: () => window.electronAPI.suppliers.getOutstanding(supplier!.id),
    enabled: open && supplier !== null && (supplier?.credit_limit ?? 0) > 0
  })

  const { data: statement, isLoading: stmtLoading } = useQuery({
    queryKey: ['suppliers', 'statement', supplier?.id, dateFrom, dateTo],
    queryFn: () => window.electronAPI.suppliers.getStatement(supplier!.id, dateFrom, dateTo),
    enabled: open && supplier !== null && activeTab === 'statement',
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
        <div className={`grid gap-4 py-3 border-b border-border ${(supplier?.credit_limit ?? 0) > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
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
          {(supplier?.credit_limit ?? 0) > 0 && (
            <div className="text-center col-span-1">
              <div className="text-xs text-muted-foreground mb-1">信用額度使用</div>
              <CreditBar used={outstandingData?.outstanding ?? 0} limit={supplier!.credit_limit} />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'orders' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            訂單記錄
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('statement')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'statement' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            對帳單
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'orders' ? (
            isLoading ? (
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
            )
          ) : (
            <div className="space-y-3 pt-1">
              {/* Date filter */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">期間：</span>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-36 text-sm" />
                <span className="text-muted-foreground">—</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-36 text-sm" />
              </div>

              {stmtLoading ? (
                <LoadingSpinner />
              ) : !statement || statement.orders.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">此期間無交易記錄</div>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">訂單號</th>
                        <th className="text-left py-2 font-medium">日期</th>
                        <th className="text-left py-2 font-medium">狀態</th>
                        <th className="text-left py-2 font-medium">付款</th>
                        <th className="text-right py-2 font-medium">金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.orders.map((order) => (
                        <tr key={order.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                          <td className="py-2 font-mono text-xs">{order.order_no}</td>
                          <td className="py-2">{formatDate(order.order_date)}</td>
                          <td className="py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${order.payment_status === 'paid' ? 'bg-green-500/15 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                              {order.payment_status === 'paid' ? '已付款' : '未付款'}
                            </span>
                          </td>
                          <td className="py-2 text-right">{formatCurrency(order.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                    <span>共 {statement.orders.length} 筆</span>
                    <span>·</span>
                    <span>總金額 <span className="text-foreground font-medium">{formatCurrency(statement.totalAmount)}</span></span>
                    <span>·</span>
                    <span>已付 <span className="text-green-400 font-medium">{formatCurrency(statement.paidAmount)}</span></span>
                    <span>·</span>
                    <span>未付 <span className="text-destructive font-medium">{formatCurrency(statement.balance)}</span></span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
