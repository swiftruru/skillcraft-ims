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
import type { SalesTrendPoint, InventoryByCategory, TopProduct, LowStockItem, MarginItem, SupplierStat, CustomerStat } from '@/types/schema'

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function Reports() {
  const [trendDays, setTrendDays] = useState(30)

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">分析期間</h2>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={trendDays === d ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setTrendDays(d)}
            >
              {d} 天
            </Button>
          ))}
        </div>
      </div>

      {/* Sales Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">銷售趨勢（近 {trendDays} 天）</CardTitle>
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
                  formatter={(v: number) => [formatCurrency(v), '營收']}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="revenue" name="營收" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">此期間無銷售資料</div>
          )}
        </CardContent>
      </Card>

      {/* Category Inventory + Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">各類別庫存值</CardTitle>
          </CardHeader>
          <CardContent>
            {categories && categories.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categories} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={70} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => [formatCurrency(v), '庫存值']} />
                  <Bar dataKey="inventory_value" radius={[0, 4, 4, 0]}>
                    {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">無庫存資料</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">銷售排行（近 {trendDays} 天）</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-2">
                {topProducts.slice(0, 8).map((p, i) => (
                  <div key={p.product_id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.sku} · {formatNumber(p.total_quantity)} 件</div>
                    </div>
                    <span className="text-sm font-semibold text-green-400">{formatCurrency(p.total_revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">無銷售資料</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-yellow-400">
            低庫存警示 {lowStock && lowStock.length > 0 && `(${lowStock.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStock && lowStock.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['SKU', '商品名稱', '類別', '現有庫存', '補貨點', '缺口', '建議補貨'].map(h => (
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
            <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">所有商品庫存充足</div>
          )}
        </CardContent>
      </Card>

      {/* Margin Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">商品毛利分析</CardTitle>
        </CardHeader>
        <CardContent>
          {marginItems && marginItems.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['SKU', '商品名稱', '類別', '售價', '進價', '毛利', '毛利率 %'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {marginItems.map((item) => {
                    const pct = item.margin_pct
                    const pctClass =
                      pct === null ? 'text-muted-foreground' :
                      pct >= 30 ? 'text-green-400 font-semibold' :
                      pct >= 10 ? 'text-yellow-400 font-semibold' :
                      'text-destructive font-semibold'
                    return (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{item.category}</td>
                        <td className="px-4 py-2">{formatCurrency(item.sell_price)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{formatCurrency(item.buy_price)}</td>
                        <td className="px-4 py-2">{formatCurrency(item.margin)}</td>
                        <td className={`px-4 py-2 ${pctClass}`}>
                          {pct !== null ? `${pct.toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">無商品資料</div>
          )}
        </CardContent>
      </Card>

      {/* Supplier & Customer Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">供應商採購統計</CardTitle>
          </CardHeader>
          <CardContent>
            {supplierStats && supplierStats.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['供應商', '採購次數', '收貨總金額', '訂單總金額'].map((h) => (
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
              <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">無供應商資料</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">客戶消費統計</CardTitle>
          </CardHeader>
          <CardContent>
            {customerStats && customerStats.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['客戶', '訂單次數', '完成總金額', '訂單總金額'].map((h) => (
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
              <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">無客戶資料</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
