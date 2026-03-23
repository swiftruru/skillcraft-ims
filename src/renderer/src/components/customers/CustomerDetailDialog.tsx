import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import type { Customer, SalesOrder } from '@/types/schema'

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

interface PointsLogEntry {
  id: number
  type: 'earned' | 'redeemed' | 'adjusted'
  amount: number
  ref_order_id: number | null
  order_no: string | null
  note: string | null
  created_at: string
}

interface Props {
  customer: Customer | null
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

export function CustomerDetailDialog({ customer, open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'orders' | 'statement' | 'points'>('orders')
  const [dateFrom, setDateFrom] = useState(startOfMonth)
  const [dateTo, setDateTo] = useState(today)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNote, setAdjustNote] = useState('')

  const { data: orders, isLoading } = useQuery<SalesOrder[]>({
    queryKey: ['customers', 'orders', customer?.id],
    queryFn: () => window.electronAPI.customers.getOrders(customer!.id),
    enabled: open && customer !== null,
    staleTime: 1000 * 60
  })

  const { data: outstandingData } = useQuery<{ outstanding: number }>({
    queryKey: ['customers', 'outstanding', customer?.id],
    queryFn: () => window.electronAPI.customers.getOutstanding(customer!.id),
    enabled: open && customer !== null && (customer?.credit_limit ?? 0) > 0
  })

  const { data: statement, isLoading: stmtLoading } = useQuery({
    queryKey: ['customers', 'statement', customer?.id, dateFrom, dateTo],
    queryFn: () => window.electronAPI.customers.getStatement(customer!.id, dateFrom, dateTo),
    enabled: open && customer !== null && activeTab === 'statement',
    staleTime: 1000 * 60
  })

  const { data: pointsLog = [], isLoading: pointsLoading } = useQuery<PointsLogEntry[]>({
    queryKey: ['customerPoints', customer?.id],
    queryFn: () => window.electronAPI.customers.getPointsLog(customer!.id),
    enabled: open && customer !== null && activeTab === 'points'
  })

  const adjustMutation = useMutation({
    mutationFn: ({ amount, note }: { amount: number; note: string }) =>
      window.electronAPI.customers.adjustPoints(customer!.id, amount, note),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customerPoints', customer?.id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast({ title: `點數已調整，餘額：${data.points_balance.toLocaleString()} 點`, variant: 'success' })
      setAdjustOpen(false)
      setAdjustAmount('')
      setAdjustNote('')
    }
  })

  const completedOrders = (orders ?? []).filter((o) => o.status === 'completed' || o.status === 'returned')
  const totalSpent = completedOrders.reduce((sum, o) => sum + o.total_amount, 0)
  const pointsBalance = customer?.points_balance ?? 0

  const typeLabel = (type: string) => {
    if (type === 'earned') return { label: '獲得', cls: 'text-green-400' }
    if (type === 'redeemed') return { label: '扣除', cls: 'text-red-400' }
    return { label: '調整', cls: 'text-amber-400' }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{customer?.name}</DialogTitle>
          </DialogHeader>

          {/* Contact info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm pb-4 border-b border-border">
            {customer?.contact && (
              <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">聯絡人</span><span>{customer.contact}</span></div>
            )}
            {customer?.phone && (
              <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">電話</span><span>{customer.phone}</span></div>
            )}
            {customer?.email && (
              <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">Email</span><span>{customer.email}</span></div>
            )}
            {customer?.address && (
              <div className="flex gap-2 col-span-2"><span className="text-muted-foreground w-16 shrink-0">地址</span><span>{customer.address}</span></div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 py-3 border-b border-border">
            <div className="text-center">
              <div className="text-xl font-bold">{(orders ?? []).length}</div>
              <div className="text-xs text-muted-foreground">訂單總數</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{completedOrders.length}</div>
              <div className="text-xs text-muted-foreground">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">{formatCurrency(totalSpent)}</div>
              <div className="text-xs text-muted-foreground">累計消費</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-amber-400">{pointsBalance.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">點數餘額</div>
            </div>
            {(customer?.credit_limit ?? 0) > 0 && (
              <div className="col-span-4">
                <div className="text-xs text-muted-foreground mb-1">信用額度使用</div>
                <CreditBar used={outstandingData?.outstanding ?? 0} limit={customer!.credit_limit} />
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
            <button
              type="button"
              onClick={() => setActiveTab('points')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'points' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              點數記錄
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === 'orders' ? (
              isLoading ? (
                <LoadingSpinner />
              ) : (orders ?? []).length === 0 ? (
                <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">尚無訂單記錄</div>
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
            ) : activeTab === 'statement' ? (
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
            ) : (
              /* Points tab */
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between pb-1">
                  <p className="text-xs text-muted-foreground">最近 50 筆點數變動記錄</p>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setAdjustAmount(''); setAdjustNote(''); setAdjustOpen(true) }}>
                    調整點數
                  </Button>
                </div>
                {pointsLoading ? (
                  <LoadingSpinner />
                ) : pointsLog.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">尚無點數記錄</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left py-2 font-medium">時間</th>
                        <th className="text-left py-2 font-medium">類型</th>
                        <th className="text-left py-2 font-medium">關聯訂單</th>
                        <th className="text-left py-2 font-medium">備註</th>
                        <th className="text-right py-2 font-medium">點數</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointsLog.map((entry) => {
                        const { label, cls } = typeLabel(entry.type)
                        return (
                          <tr key={entry.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                            <td className="py-2 text-xs text-muted-foreground">{entry.created_at.slice(0, 16).replace('T', ' ')}</td>
                            <td className="py-2"><span className={`text-xs font-medium ${cls}`}>{label}</span></td>
                            <td className="py-2 font-mono text-xs">{entry.order_no ?? '—'}</td>
                            <td className="py-2 text-xs text-muted-foreground">{entry.note ?? '—'}</td>
                            <td className={`py-2 text-right font-medium text-sm ${entry.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {entry.amount >= 0 ? '+' : ''}{entry.amount}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust points dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>調整點數</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="adjust-amount">調整數量（正數=加點，負數=扣點）</Label>
              <Input
                id="adjust-amount"
                type="number"
                placeholder="例：100 或 -50"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-note">備註</Label>
              <Input
                id="adjust-note"
                placeholder="例：週年慶補點"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>取消</Button>
            <Button
              disabled={!adjustAmount || isNaN(Number(adjustAmount)) || adjustMutation.isPending}
              onClick={() => adjustMutation.mutate({ amount: Number(adjustAmount), note: adjustNote })}
            >
              確認調整
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
