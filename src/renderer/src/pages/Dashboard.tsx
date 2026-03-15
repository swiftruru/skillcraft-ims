import { useState, useEffect } from 'react'
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
  ClipboardList,
  ArrowDownLeft,
  ArrowUpRight,
  Brain,
  RefreshCw,
  LayoutDashboard,
  Eye,
  EyeOff,
  Trophy,
  ChevronDown,
  ChevronUp
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
import type { DashboardKPIs, SalesTrendPoint, InventoryByCategory, SalesOrder, LowStockItem, PurchaseSuggestion, AiForecastResult, UnpaidOrder, TopProduct } from '@/types/schema'
import { useLang } from '@/lib/useLang'

const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
const WIDGET_KEYS = ['quickActions', 'kpis', 'salesTrend', 'topProducts', 'lowStock', 'pendingSales', 'purchaseSuggestions', 'aiInsight']

export default function Dashboard() {
  const t = useLang()
  const d = t.dashboard
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())
  const [aiForecast, setAiForecast] = useState<AiForecastResult | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [topProductDays, setTopProductDays] = useState(30)
  const [customizing, setCustomizing] = useState(false)
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('ims-dashboard-hidden')
      return raw ? new Set<string>(JSON.parse(raw)) : new Set()
    } catch { return new Set() }
  })

  useEffect(() => {
    localStorage.setItem('ims-dashboard-hidden', JSON.stringify(Array.from(hiddenWidgets)))
  }, [hiddenWidgets])

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ims-dashboard-order') ?? 'null') as string[] | null
      if (saved && Array.isArray(saved) && saved.length > 0) return saved
    } catch {}
    return WIDGET_KEYS.filter((k) => k !== 'pendingSales')
  })
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [overdueCollapsed, setOverdueCollapsed] = useState(true)
  const [dueSoonCollapsed, setDueSoonCollapsed] = useState(true)

  useEffect(() => {
    localStorage.setItem('ims-dashboard-order', JSON.stringify(widgetOrder))
  }, [widgetOrder])

  const handleWidgetDrop = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) { setDragKey(null); setDragOverKey(null); return }
    setWidgetOrder((prev) => {
      const next = [...prev]
      const fromIdx = next.indexOf(dragKey)
      const toIdx = next.indexOf(targetKey)
      if (fromIdx === -1 || toIdx === -1) return prev
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, dragKey)
      return next
    })
    setDragKey(null)
    setDragOverKey(null)
  }

  const toggleWidget = (key: string) => {
    setHiddenWidgets((prev) => {
      if (prev.size >= WIDGET_KEYS.length - 1 && !prev.has(key)) return prev
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  const wrap = (key: string, label: string, content: React.ReactNode) => {
    const order = widgetOrder.indexOf(key)
    const orderStyle = order !== -1 ? { order } : {}
    const isDragTarget = customizing && dragOverKey === key && dragKey !== key
    const dragProps = customizing ? {
      draggable: true,
      onDragStart: () => setDragKey(key),
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOverKey(key) },
      onDrop: () => handleWidgetDrop(key),
      onDragEnd: () => { setDragKey(null); setDragOverKey(null) }
    } : {}
    if (!customizing && hiddenWidgets.has(key)) return null
    if (customizing && hiddenWidgets.has(key)) {
      return (
        <div
          style={orderStyle}
          {...dragProps}
          className={`flex items-center justify-between px-4 py-2.5 rounded-lg border border-dashed border-border/50 text-sm text-muted-foreground bg-muted/10 cursor-grab${isDragTarget ? ' ring-2 ring-primary/40' : ''}`}
        >
          <span className="flex items-center gap-2"><EyeOff className="w-3.5 h-3.5" />{label}</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => toggleWidget(key)}>
            <Eye className="w-3.5 h-3.5" />{d.customizeShow}
          </Button>
        </div>
      )
    }
    if (!customizing) return <div style={orderStyle}>{content}</div>
    return (
      <div
        style={orderStyle}
        {...dragProps}
        className={`cursor-grab${isDragTarget ? ' ring-2 ring-primary/40 rounded-xl' : ''}`}
      >
        <div>
          <div className="flex justify-end -mb-2 pr-1">
            <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => toggleWidget(key)}>
              <EyeOff className="w-3 h-3" />{d.customizeHide}
            </Button>
          </div>
          {content}
        </div>
      </div>
    )
  }

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

  const { data: unpaidOrders } = useQuery<{ sales: UnpaidOrder[]; purchases: UnpaidOrder[] }>({
    queryKey: ['reports', 'unpaidOrders'],
    queryFn: () => window.electronAPI.reports.getUnpaidOrders(),
    staleTime: 1000 * 30,
    enabled: (kpis?.overdueCount ?? 0) > 0 || (kpis?.dueSoonCount ?? 0) > 0
  })

  const { data: suggestions } = useQuery<PurchaseSuggestion[]>({
    queryKey: ['inventory', 'suggestions'],
    queryFn: () => window.electronAPI.inventory.getPurchaseSuggestions()
  })

  const { data: topProducts } = useQuery<TopProduct[]>({
    queryKey: ['reports', 'topProducts', topProductDays],
    queryFn: () => window.electronAPI.reports.topProducts(topProductDays),
    staleTime: 1000 * 60 * 5
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

  const aiForecastMutation = useMutation({
    mutationFn: () => window.electronAPI.ai.forecast(),
    onSuccess: (data) => {
      setAiForecast(data)
      setAiError(null)
    },
    onError: (err: Error) => {
      setAiError(err.message ?? 'AI 預測失敗，請重試。')
    }
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
      {/* Header with Customize button */}
      <div className="flex items-center justify-end">
        <Button
          variant={customizing ? 'secondary' : 'ghost'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setCustomizing((v) => !v)}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          {d.customize}
        </Button>
      </div>

      <div className="flex flex-col gap-6" onDragLeave={() => setDragOverKey(null)}>
      {/* Quick Actions */}
      {wrap('quickActions', d.addPurchase, (
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => navigate('/purchases', { state: { openForm: true } })}>
            <Plus className="w-4 h-4" />{d.addPurchase}
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => navigate('/sales', { state: { openForm: true } })}>
            <Plus className="w-4 h-4" />{d.addSales}
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => navigate('/stock-take', { state: { createNew: true } })}>
            <ClipboardList className="w-4 h-4" />{d.startStockTake}
          </Button>
        </div>
      ))}

      {/* KPI Cards */}
      {wrap('kpis', d.inventoryValue, (
        <div className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
            <KpiCard
              title={d.unpaidReceivables}
              value={formatCurrency(kpis?.unpaidSalesTotal ?? 0)}
              subtitle={d.unpaidReceivablesHint}
              icon={<ArrowDownLeft className="w-4 h-4" />}
              color={(kpis?.unpaidSalesTotal ?? 0) > 0 ? 'text-emerald-400' : 'text-muted-foreground'}
            />
            <KpiCard
              title={d.unpaidPayables}
              value={formatCurrency(kpis?.unpaidPurchasesTotal ?? 0)}
              subtitle={d.unpaidPayablesHint}
              icon={<ArrowUpRight className="w-4 h-4" />}
              color={(kpis?.unpaidPurchasesTotal ?? 0) > 0 ? 'text-rose-400' : 'text-muted-foreground'}
            />
          </div>
        </div>
      ))}

      {/* Overdue Alerts - fixed order */}
      <div style={{ order: -2 }}>
      {(kpis?.overdueCount ?? 0) > 0 && (() => {
        const overdueItems: { order: UnpaidOrder; type: 'sales' | 'purchases' }[] = [
          ...(unpaidOrders?.sales.filter((o) => o.overdue) ?? []).map((o) => ({ order: o, type: 'sales' as const })),
          ...(unpaidOrders?.purchases.filter((o) => o.overdue) ?? []).map((o) => ({ order: o, type: 'purchases' as const }))
        ]
        return (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setOverdueCollapsed((v) => !v)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">{d.overdueAlertsTitle}</span>
                  <Badge className="bg-red-500/15 text-red-400 border-0">{kpis!.overdueCount}</Badge>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <button
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    onClick={(e) => { e.stopPropagation(); navigate('/receivables') }}
                  >
                    {d.viewReceivables}
                  </button>
                  {overdueCollapsed
                    ? <ChevronDown className="w-4 h-4 text-red-400/60" />
                    : <ChevronUp className="w-4 h-4 text-red-400/60" />
                  }
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{d.overdueAlertsHint(kpis!.overdueCount)}</p>
            </CardHeader>
            {!overdueCollapsed && overdueItems.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {overdueItems.slice(0, 5).map(({ order, type }) => (
                    <div key={`${type}-${order.id}`} className="flex items-center justify-between py-1.5 border-b border-red-500/10 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${type === 'sales' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                          {type === 'sales' ? d.overdueTypeSales : d.overdueTypePurchases}
                        </span>
                        <span className="text-sm font-mono text-muted-foreground shrink-0">{order.order_no}</span>
                        <span className="text-sm truncate">{order.party_name}</span>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-sm font-semibold text-red-400">{formatCurrency(order.total_amount)}</div>
                        <div className="text-[10px] text-muted-foreground">{order.payment_due_date ? formatDate(order.payment_due_date) : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })()}
      </div>

      {/* Due Soon Alerts - fixed order */}
      <div style={{ order: -1 }}>
      {(kpis?.dueSoonCount ?? 0) > 0 && (() => {
        const today = new Date().toISOString().slice(0, 10)
        const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
        const dueSoonItems: { order: UnpaidOrder; type: 'sales' | 'purchases' }[] = [
          ...(unpaidOrders?.sales.filter((o) => !o.overdue && !!o.payment_due_date && o.payment_due_date >= today && o.payment_due_date <= in7Days) ?? []).map((o) => ({ order: o, type: 'sales' as const })),
          ...(unpaidOrders?.purchases.filter((o) => !o.overdue && !!o.payment_due_date && o.payment_due_date >= today && o.payment_due_date <= in7Days) ?? []).map((o) => ({ order: o, type: 'purchases' as const }))
        ]
        return (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setDueSoonCollapsed((v) => !v)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400">{d.dueSoonTitle}</span>
                  <Badge className="bg-amber-500/15 text-amber-400 border-0">{kpis!.dueSoonCount}</Badge>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <button
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    onClick={(e) => { e.stopPropagation(); navigate('/receivables') }}
                  >
                    {d.viewReceivables}
                  </button>
                  {dueSoonCollapsed
                    ? <ChevronDown className="w-4 h-4 text-amber-400/60" />
                    : <ChevronUp className="w-4 h-4 text-amber-400/60" />
                  }
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{d.dueSoonHint(kpis!.dueSoonCount)}</p>
            </CardHeader>
            {!dueSoonCollapsed && dueSoonItems.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {dueSoonItems.slice(0, 5).map(({ order, type }) => (
                    <div key={`${type}-${order.id}`} className="flex items-center justify-between py-1.5 border-b border-amber-500/10 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${type === 'sales' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                          {type === 'sales' ? d.overdueTypeSales : d.overdueTypePurchases}
                        </span>
                        <span className="text-sm font-mono text-muted-foreground shrink-0">{order.order_no}</span>
                        <span className="text-sm truncate">{order.party_name}</span>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-sm font-semibold text-amber-400">{formatCurrency(order.total_amount)}</div>
                        <div className="text-[10px] text-muted-foreground">{order.payment_due_date ? formatDate(order.payment_due_date) : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })()}
      </div>

      {/* Charts Row */}
      {wrap('salesTrend', d.salesTrend, <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
      </div>)}

      {/* Top Products */}
      {wrap('topProducts', d.topProducts, (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                {d.topProducts}
              </CardTitle>
              <div className="flex gap-1">
                {[30, 90, 180].map((n) => (
                  <Button
                    key={n}
                    variant={topProductDays === n ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setTopProductDays(n)}
                  >
                    {d.topProductsDays(n)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={Math.min(topProducts.length, 5) * 40 + 20}>
                  <BarChart layout="vertical" data={topProducts.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={90} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(v: number) => [formatCurrency(v), d.topProductsRevenue]}
                    />
                    <Bar dataKey="total_revenue" radius={[0, 4, 4, 0]}>
                      {topProducts.slice(0, 5).map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-0 border-t border-border pt-2">
                  {topProducts.map((item, i) => (
                    <div key={item.product_id} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold">{formatCurrency(item.total_revenue)}</div>
                        <div className="text-xs text-muted-foreground">{d.topProductsQty}: {item.total_quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                {d.noTopProductsData}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Bottom Row */}
      {wrap('lowStock', d.lowStockItems, <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
      </div>)}

      {/* Purchase Suggestions */}
      {wrap('purchaseSuggestions', d.restockSuggestion, suggestions && suggestions.length > 0 ? (
        <Card className="border-orange-400/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-orange-400" />
                {d.restockSuggestion}
                <Badge variant="warning">{suggestions.length}</Badge>
              </CardTitle>
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5"
                disabled={selectedSuggestions.size === 0 || createPOMutation.isPending}
                onClick={handleCreatePO}
              >
                <ShoppingCart className="w-3 h-3" />
                {d.createPurchaseOrder(selectedSuggestions.size)}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 text-xs text-muted-foreground px-1 pb-2 border-b border-border">
                <span></span>
                <span>{d.product}</span>
                <span className="text-right">{d.currentStock}</span>
                <span className="text-right">{d.suggestedQty}</span>
                <span className="text-right">{d.estimatedCost}</span>
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
                      <div className="text-xs text-muted-foreground">{d.reorderPoint(item.reorder_pt)}</div>
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
              <span>{d.selectItemsHint}</span>
              <span className="font-semibold text-foreground">
                {d.estimatedTotal}{formatCurrency(
                  (suggestions ?? [])
                    .filter((s) => selectedSuggestions.has(s.product_id))
                    .reduce((sum, s) => sum + s.estimated_cost, 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null)}

      {/* AI Demand Forecast */}
      {wrap('aiInsight', 'AI 需求預測', <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" />
              AI 需求預測
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              disabled={aiForecastMutation.isPending}
              onClick={() => aiForecastMutation.mutate()}
            >
              <RefreshCw className={`w-3 h-3 ${aiForecastMutation.isPending ? 'animate-spin' : ''}`} />
              {aiForecastMutation.isPending ? '分析中...' : '生成預測'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiError && (
            <div className="text-sm text-red-400 py-2">{aiError}</div>
          )}
          {!aiForecast && !aiError && !aiForecastMutation.isPending && (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
              點擊「生成預測」，Claude AI 將分析近 30 天銷售資料並提供補貨建議
            </div>
          )}
          {aiForecastMutation.isPending && (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              正在分析庫存與銷售資料...
            </div>
          )}
          {aiForecast && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{aiForecast.summary}</p>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-xs text-muted-foreground bg-muted/30 px-3 py-2">
                  <span>商品</span>
                  <span className="text-right">現有庫存</span>
                  <span className="text-right">預計售完</span>
                  <span className="text-right">建議補貨</span>
                </div>
                <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
                  {aiForecast.items
                    .filter((item) => item.suggested_reorder_qty > 0)
                    .slice(0, 10)
                    .map((item) => (
                      <div key={item.product_id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-3 py-2 items-center">
                        <div>
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.reasoning}</div>
                        </div>
                        <div className="text-right text-sm tabular-nums">{item.stock_qty}</div>
                        <div className={`text-right text-sm tabular-nums ${item.days_remaining !== null && item.days_remaining <= 7 ? 'text-red-400 font-semibold' : 'text-muted-foreground'}`}>
                          {item.days_remaining !== null ? `${item.days_remaining} 天` : '—'}
                        </div>
                        <div className="text-right text-sm font-semibold text-violet-400 tabular-nums">
                          +{item.suggested_reorder_qty}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                生成時間：{new Date(aiForecast.generatedAt).toLocaleString('zh-TW')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>)}

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
