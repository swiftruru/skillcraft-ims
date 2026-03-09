import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  DollarSign,
  BarChart2,
  ShoppingBag,
  Clock,
  ShoppingCart,
  CheckSquare,
  Square,
  Plus,
  ClipboardList
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { formatCurrency, formatDate, calcChangePercent } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
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
import type { DashboardKPIs, SalesTrendPoint, InventoryByCategory, SalesOrder, LowStockItem, PurchaseSuggestion } from '@/types/schema'
import { useLang } from '@/lib/useLang'

const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function Dashboard() {
  const t = useLang()
  const d = t.dashboard
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())

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

  const { data: suggestions } = useQuery<PurchaseSuggestion[]>({
    queryKey: ['inventory', 'suggestions'],
    queryFn: () => window.electronAPI.inventory.getPurchaseSuggestions()
  })

  const createPOMutation = useMutation({
    mutationFn: (items: { product_id: number; quantity: number; unit_price: number }[]) =>
      window.electronAPI.inventory.createPurchaseFromSuggestions(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'suggestions'] })
      setSelectedSuggestions(new Set())
      toast({ title: '採購單已建立', variant: 'success' })
    },
    onError: () => toast({ title: '建立失敗', variant: 'destructive' })
  })

  const toggleSuggestion = (id: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreatePO = () => {
    const items = (suggestions ?? [])
      .filter((s) => selectedSuggestions.has(s.product_id))
      .map((s) => ({ product_id: s.product_id, quantity: s.suggested_qty, unit_price: s.buy_price }))
    if (items.length === 0) return
    createPOMutation.mutate(items)
  }

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
      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" size="sm" className="gap-2"
          onClick={() => navigate('/purchases', { state: { openForm: true } })}>
          <Plus className="w-4 h-4" />新增採購單
        </Button>
        <Button variant="outline" size="sm" className="gap-2"
          onClick={() => navigate('/sales', { state: { openForm: true } })}>
          <Plus className="w-4 h-4" />新增銷售單
        </Button>
        <Button variant="outline" size="sm" className="gap-2"
          onClick={() => navigate('/stock-take', { state: { createNew: true } })}>
          <ClipboardList className="w-4 h-4" />開始盤點
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title={d.inventoryValue}
          value={formatCurrency(kpis?.totalInventoryValue ?? 0)}
          subtitle={d.totalProducts(kpis?.totalProducts ?? 0)}
          icon={<Package className="w-4 h-4" />}
          color="text-blue-400"
        />
        <KpiCard
          title={d.monthlyRevenue}
          value={formatCurrency(kpis?.monthlyRevenue ?? 0)}
          subtitle={<ChangeIndicator value={revenueChange} suffix={d.vsLastMonth} />}
          icon={<DollarSign className="w-4 h-4" />}
          color="text-green-400"
        />
        <KpiCard
          title={d.grossMargin}
          value={`${profitMargin}%`}
          subtitle={<ChangeIndicator value={profitChange} suffix={d.vsLastMonth} />}
          icon={<BarChart2 className="w-4 h-4" />}
          color="text-purple-400"
        />
        <KpiCard
          title={d.lowStockAlert}
          value={String(kpis?.lowStockCount ?? 0)}
          subtitle={d.itemsNeedRestock}
          icon={<AlertTriangle className="w-4 h-4" />}
          color={kpis?.lowStockCount ? 'text-yellow-400' : 'text-muted-foreground'}
          alert={!!kpis?.lowStockCount}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{d.salesTrend}</CardTitle>
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
                    formatter={(v: number) => [formatCurrency(v), d.revenue]}
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
                {d.noSalesData}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{d.inventoryByCategory}</CardTitle>
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
                    formatter={(v: number) => [formatCurrency(v), d.inventoryValueTooltip]}
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
                {d.noInventoryData}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              {d.lowStockItems}
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
                        {d.stockLabel(item.stock_qty)}
                      </div>
                      <div className="text-xs text-muted-foreground">{d.reorderLabel(item.reorder_pt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                {d.allStockSufficient}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-400" />
              {d.pendingSalesOrders}
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
                        {(order as { customer_name?: string }).customer_name ?? d.generalCustomer}
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
                {d.noPendingSales}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purchase Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <Card className="border-orange-400/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-orange-400" />
                補貨建議
                <Badge variant="warning">{suggestions.length}</Badge>
              </CardTitle>
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5"
                disabled={selectedSuggestions.size === 0 || createPOMutation.isPending}
                onClick={handleCreatePO}
              >
                <ShoppingCart className="w-3 h-3" />
                建立採購單（{selectedSuggestions.size} 項）
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 text-xs text-muted-foreground px-1 pb-2 border-b border-border">
                <span></span>
                <span>商品</span>
                <span className="text-right">現有庫存</span>
                <span className="text-right">建議補貨</span>
                <span className="text-right">預估費用</span>
              </div>
              {suggestions.map((item) => {
                const selected = selectedSuggestions.has(item.product_id)
                return (
                  <div
                    key={item.product_id}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 items-center py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 rounded px-1 transition-colors ${selected ? 'bg-orange-400/5' : ''}`}
                    onClick={() => toggleSuggestion(item.product_id)}
                  >
                    <span className={selected ? 'text-orange-400' : 'text-muted-foreground'}>
                      {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${item.stock_qty === 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {item.stock_qty}
                      </span>
                      <div className="text-xs text-muted-foreground">補貨點 {item.reorder_pt}</div>
                    </div>
                    <div className="text-right text-sm font-semibold text-blue-400">
                      +{item.suggested_qty}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {formatCurrency(item.estimated_cost)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
              <span>點選勾選要採購的項目</span>
              <span className="font-semibold text-foreground">
                預估總費用：{formatCurrency(
                  (suggestions ?? [])
                    .filter((s) => selectedSuggestions.has(s.product_id))
                    .reduce((sum, s) => sum + s.estimated_cost, 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
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
