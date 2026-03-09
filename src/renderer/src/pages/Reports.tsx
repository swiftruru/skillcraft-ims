import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts'
import type { SalesTrendPoint, InventoryByCategory, TopProduct, LowStockItem, MarginItem, SupplierStat, CustomerStat, SlowMovingItem } from '@/types/schema'
import { useLang } from '@/lib/useLang'

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

function getDaysForPeriod(period: string): number {
  const now = new Date()
  switch (period) {
    case 'this-month': return now.getDate()
    case 'last-month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 0)
      return d.getDate() + now.getDate()
    }
    case 'this-quarter': {
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      return Math.ceil((now.getTime() - qStart.getTime()) / 86400000) + 1
    }
    default: return Number(period)
  }
}

export default function Reports() {
  const t = useLang()
  const r = t.reports
  const [period, setPeriod] = useState('30')
  const [slowDays, setSlowDays] = useState(60)
  const trendDays = getDaysForPeriod(period)

  const PERIODS = [
    { label: r.period7, value: '7' },
    { label: r.period30, value: '30' },
    { label: r.thisMonth, value: 'this-month' },
    { label: r.lastMonth, value: 'last-month' },
    { label: r.thisQuarter, value: 'this-quarter' },
    { label: r.period90, value: '90' },
  ]

  const { data: trend, isLoading: trendLoading } = useQuery<SalesTrendPoint[]>({
    queryKey: ['reports', 'salesTrend', trendDays],
    queryFn: () => window.electronAPI.reports.salesTrend(trendDays)
  })
  const { data: categories } = useQuery<InventoryByCategory[]>({
    queryKey: ['reports', 'inventoryByCategory'],
    queryFn: () => window.electronAPI.reports.inventoryByCategory()
  })
  const { data: topProducts } = useQuery<TopProduct[]>({
    queryKey: ['reports', 'topProducts', trendDays],
    queryFn: () => window.electronAPI.reports.topProducts(trendDays)
  })
  const { data: lowStock } = useQuery<LowStockItem[]>({
    queryKey: ['reports', 'lowStock'],
    queryFn: () => window.electronAPI.reports.lowStock()
  })
  const { data: marginItems } = useQuery<MarginItem[]>({
    queryKey: ['reports', 'marginAnalysis'],
    queryFn: () => window.electronAPI.reports.marginAnalysis(),
    staleTime: 1000 * 60 * 5
  })
  const { data: supplierStats } = useQuery<SupplierStat[]>({
    queryKey: ['reports', 'supplierStats'],
    queryFn: () => window.electronAPI.reports.supplierStats(),
    staleTime: 1000 * 60 * 5
  })
  const { data: customerStats } = useQuery<CustomerStat[]>({
    queryKey: ['reports', 'customerStats'],
    queryFn: () => window.electronAPI.reports.customerStats(),
    staleTime: 1000 * 60 * 5
  })
  const { data: slowMoving } = useQuery<SlowMovingItem[]>({
    queryKey: ['reports', 'slowMoving', slowDays],
    queryFn: () => window.electronAPI.reports.slowMoving(slowDays),
    staleTime: 1000 * 60 * 5
  })

  return (
    <div className="p-6 space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">{r.salesTrend}</h2>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={period === p.value ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Sales Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{r.salesTrend}（{trendDays}d）</CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading ? <LoadingSpinner /> : trend && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => [formatCurrency(v), r.revenue]}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="revenue" name={r.revenue} stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">{r.noData}</div>
          )}
        </CardContent>
      </Card>

      {/* Category Inventory + Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{r.inventoryByCategory}</CardTitle>
          </CardHeader>
          <CardContent>
            {categories && categories.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categories} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={70} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => [formatCurrency(v), r.inventoryByCategory]} />
                  <Bar dataKey="inventory_value" radius={[0, 4, 4, 0]}>
                    {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">{r.noData}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{r.topProducts}（{trendDays}d）</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-2">
                {topProducts.slice(0, 8).map((p, i) => (
                  <div key={p.product_id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.sku} · {formatNumber(p.total_quantity)} {r.quantity}</div>
                    </div>
                    <span className="text-sm font-semibold text-green-400">{formatCurrency(p.total_revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">{r.noData}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-yellow-400">
            {r.lowStockItems} {lowStock && lowStock.length > 0 && `(${lowStock.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStock && lowStock.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['SKU', t.products.title, t.products.category, t.products.stock, '補貨點', '缺口', '建議補貨'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((item) => {
                    const gap = item.reorder_pt - item.stock_qty
                    const suggested = Math.max(gap, item.reorder_pt)
                    return (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{item.category}</td>
                        <td className="px-4 py-2 text-yellow-400 font-semibold">{item.stock_qty}</td>
                        <td className="px-4 py-2 text-muted-foreground">{item.reorder_pt}</td>
                        <td className="px-4 py-2 text-red-400">{gap}</td>
                        <td className="px-4 py-2 text-blue-400 font-semibold">{suggested}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">{t.dashboard.allStockSufficient}</div>
          )}
        </CardContent>
      </Card>

      {/* Margin Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{r.grossMargin}</CardTitle>
        </CardHeader>
        <CardContent>
          {marginItems && marginItems.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['SKU', t.products.title, t.products.category, t.products.sellPrice, t.products.buyPrice, '毛利', '毛利率 %'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {marginItems.map((item) => {
                    const pct = item.margin_pct
                    const pctClass = pct === null ? 'text-muted-foreground' : pct >= 30 ? 'text-green-400 font-semibold' : pct >= 10 ? 'text-yellow-400 font-semibold' : 'text-destructive font-semibold'
                    return (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{item.category}</td>
                        <td className="px-4 py-2">{formatCurrency(item.sell_price)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{formatCurrency(item.buy_price)}</td>
                        <td className="px-4 py-2">{formatCurrency(item.margin)}</td>
                        <td className={`px-4 py-2 ${pctClass}`}>{pct !== null ? `${pct.toFixed(1)}%` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">{r.noData}</div>
          )}
        </CardContent>
      </Card>

      {/* Supplier & Customer Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{r.supplierStats}</CardTitle>
          </CardHeader>
          <CardContent>
            {supplierStats && supplierStats.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {[t.suppliers.name, r.orders, r.revenue, t.common.amount].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {supplierStats.map((s) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{s.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.order_count}</td>
                        <td className="px-3 py-2 text-blue-400 font-semibold">{formatCurrency(s.total_received)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatCurrency(s.total_ordered)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">{r.noData}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{r.customerStats}</CardTitle>
          </CardHeader>
          <CardContent>
            {customerStats && customerStats.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {[t.customers.name, r.orders, r.revenue, t.common.amount].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customerStats.map((c) => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{c.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.order_count}</td>
                        <td className="px-3 py-2 text-green-400 font-semibold">{formatCurrency(c.total_spent)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatCurrency(c.total_ordered)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">{r.noData}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slow-Moving Inventory */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">停滯品分析</CardTitle>
            <div className="flex gap-1">
              {[30, 60, 90].map((d) => (
                <Button
                  key={d}
                  variant={slowDays === d ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSlowDays(d)}
                >
                  {d} 天
                </Button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            庫存量 &gt; 0 但超過 {slowDays} 天未有任何異動的商品
          </p>
        </CardHeader>
        <CardContent>
          {!slowMoving || slowMoving.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
              {slowDays} 天內無停滯品
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">商品名稱</th>
                    <th className="text-left px-3 py-2 font-medium font-mono">SKU</th>
                    <th className="text-left px-3 py-2 font-medium">{t.products.category}</th>
                    <th className="text-right px-3 py-2 font-medium">庫存</th>
                    <th className="text-right px-3 py-2 font-medium">庫存價值</th>
                    <th className="text-right px-3 py-2 font-medium">停滯天數</th>
                  </tr>
                </thead>
                <tbody>
                  {slowMoving.map((item) => {
                    const idleColor = item.days_idle >= 90
                      ? 'text-destructive'
                      : item.days_idle >= 60
                        ? 'text-orange-400'
                        : 'text-yellow-400'
                    return (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{item.name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.sku}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.category}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(item.stock_qty)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.stock_value)}</td>
                        <td className={`px-3 py-2 text-right font-semibold tabular-nums ${idleColor}`}>
                          {item.days_idle} 天
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground text-right mt-2 px-3">
                共 {slowMoving.length} 項停滯品，庫存價值合計 {formatCurrency(slowMoving.reduce((s, i) => s + i.stock_value, 0))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
