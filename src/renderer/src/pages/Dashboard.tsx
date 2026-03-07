import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  DollarSign,
  BarChart2,
  ShoppingBag,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { formatCurrency, formatDate, calcChangePercent } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts'
import type { DashboardKPIs, SalesTrendPoint, InventoryByCategory, SalesOrder, LowStockItem } from '@/types/schema'

const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKPIs>({
    queryKey: ['reports', 'kpis'],
    queryFn: () => window.electronAPI.reports.kpis()
  })

  const { data: trend } = useQuery<SalesTrendPoint[]>({
    queryKey: ['reports', 'salesTrend', 30],
    queryFn: () => window.electronAPI.reports.salesTrend(30)
  })

  const { data: categoryData } = useQuery<InventoryByCategory[]>({
    queryKey: ['reports', 'inventoryByCategory'],
    queryFn: () => window.electronAPI.reports.inventoryByCategory()
  })

  const { data: lowStock } = useQuery<LowStockItem[]>({
    queryKey: ['reports', 'lowStock'],
    queryFn: () => window.electronAPI.reports.lowStock()
  })

  const { data: pendingSales } = useQuery<SalesOrder[]>({
    queryKey: ['sales', 'all', { status: 'pending' }],
    queryFn: () => window.electronAPI.sales.getAll({ status: 'pending' })
  })

  if (kpisLoading) return <LoadingSpinner />

  const revenueChange = calcChangePercent(
    kpis?.monthlyRevenue ?? 0,
    kpis?.monthlyRevenuePrev ?? 0
  )
  const profitChange = calcChangePercent(
    kpis?.monthlyGrossProfit ?? 0,
    kpis?.monthlyGrossProfitPrev ?? 0
  )
  const profitMargin =
    kpis?.monthlyRevenue
      ? ((kpis.monthlyGrossProfit / kpis.monthlyRevenue) * 100).toFixed(1)
      : '0.0'

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="庫存總值"
          value={formatCurrency(kpis?.totalInventoryValue ?? 0)}
          subtitle={`${kpis?.totalProducts ?? 0} 種商品`}
          icon={<Package className="w-4 h-4" />}
          color="text-blue-400"
        />
        <KpiCard
          title="本月營收"
          value={formatCurrency(kpis?.monthlyRevenue ?? 0)}
          subtitle={
            <ChangeIndicator value={revenueChange} suffix="% vs 上月" />
          }
          icon={<DollarSign className="w-4 h-4" />}
          color="text-green-400"
        />
        <KpiCard
          title="本月毛利率"
          value={`${profitMargin}%`}
          subtitle={
            <ChangeIndicator value={profitChange} suffix="% vs 上月" />
          }
          icon={<BarChart2 className="w-4 h-4" />}
          color="text-purple-400"
        />
        <KpiCard
          title="低庫存警示"
          value={String(kpis?.lowStockCount ?? 0)}
          subtitle="項商品需補貨"
          icon={<AlertTriangle className="w-4 h-4" />}
          color={kpis?.lowStockCount ? 'text-yellow-400' : 'text-muted-foreground'}
          alert={!!kpis?.lowStockCount}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">近 30 天銷售趨勢</CardTitle>
          </CardHeader>
          <CardContent>
            {trend && trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(v: number) => [formatCurrency(v), '營收']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                本月尚無銷售資料
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory by Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">各類別庫存值</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData && categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(v: number) => [formatCurrency(v), '庫存值']}
                  />
                  <Bar dataKey="inventory_value" radius={[4, 4, 0, 0]}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                無庫存資料
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Low Stock + Pending Sales */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              低庫存商品
              {lowStock && lowStock.length > 0 && (
                <Badge variant="warning">{lowStock.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock && lowStock.length > 0 ? (
              <div className="space-y-2">
                {lowStock.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-yellow-400">
                        庫存 {item.stock_qty}
                      </div>
                      <div className="text-xs text-muted-foreground">補貨點 {item.reorder_pt}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                所有商品庫存充足
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Sales Orders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-400" />
              待處理銷售單
              {kpis?.pendingSalesOrders ? (
                <Badge variant="secondary">{kpis.pendingSalesOrders}</Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingSales && pendingSales.length > 0 ? (
              <div className="space-y-2">
                {pendingSales.slice(0, 6).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium">{order.order_no}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(order.order_date)} ·{' '}
                        {(order as { customer_name?: string }).customer_name ?? '一般客戶'}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-green-400">
                      {formatCurrency(order.total_amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                沒有待處理的銷售單
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color,
  alert
}: {
  title: string
  value: string
  subtitle: React.ReactNode
  icon: React.ReactNode
  color: string
  alert?: boolean
}) {
  return (
    <Card className={alert ? 'border-yellow-400/30' : ''}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>
          <div className={`p-2 rounded-lg bg-current/10 ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChangeIndicator({ value, suffix }: { value: number; suffix: string }) {
  const positive = value >= 0
  return (
    <span className={positive ? 'text-green-400' : 'text-red-400'}>
      {positive ? <TrendingUp className="inline w-3 h-3 mr-0.5" /> : <TrendingDown className="inline w-3 h-3 mr-0.5" />}
      {positive ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  )
}
