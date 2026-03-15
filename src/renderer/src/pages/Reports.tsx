import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { FileDown, Printer } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts'
import type { SalesTrendPoint, InventoryByCategory, TopProduct, LowStockItem, MarginItem, SupplierStat, CustomerStat, SlowMovingItem, TopCustomerItem, PurchaseVsSalesPoint, TurnoverItem, AbcItem, MonthlyPLPoint } from '@/types/schema'
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
  const [period, setPeriod] = useState(() => localStorage.getItem('ims-reports-range') ?? '30')
  const [slowDays, setSlowDays] = useState(60)
  const [turnoverDays, setTurnoverDays] = useState(30)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [csvExporting, setCsvExporting] = useState(false)
  const now = new Date()
  const [pdfYear, setPdfYear] = useState(now.getFullYear())
  const [pdfMonth, setPdfMonth] = useState(now.getMonth() + 1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const trendDays = period === 'custom' && dateFrom && dateTo
    ? Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000) + 1
    : getDaysForPeriod(period)
  const customDates = period === 'custom' && dateFrom && dateTo
    ? { dateFrom, dateTo }
    : undefined

  const PERIODS = [
    { label: r.period7, value: '7' },
    { label: r.period30, value: '30' },
    { label: r.thisMonth, value: 'this-month' },
    { label: r.lastMonth, value: 'last-month' },
    { label: r.thisQuarter, value: 'this-quarter' },
    { label: r.period90, value: '90' },
    { label: r.custom, value: 'custom' },
  ]

  const { data: trend, isLoading: trendLoading } = useQuery<SalesTrendPoint[]>({
    queryKey: ['reports', 'salesTrend', trendDays, customDates],
    queryFn: () => window.electronAPI.reports.salesTrend(trendDays, customDates?.dateFrom, customDates?.dateTo)
  })
  const { data: categories } = useQuery<InventoryByCategory[]>({
    queryKey: ['reports', 'inventoryByCategory'],
    queryFn: () => window.electronAPI.reports.inventoryByCategory()
  })
  const { data: topProducts } = useQuery<TopProduct[]>({
    queryKey: ['reports', 'topProducts', trendDays, customDates],
    queryFn: () => window.electronAPI.reports.topProducts(trendDays, customDates?.dateFrom, customDates?.dateTo)
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
  const { data: topCustomers } = useQuery<TopCustomerItem[]>({
    queryKey: ['reports', 'topCustomers'],
    queryFn: () => window.electronAPI.reports.topCustomers(),
    staleTime: 1000 * 60 * 5
  })
  const { data: turnover } = useQuery<TurnoverItem[]>({
    queryKey: ['reports', 'turnoverAnalysis', turnoverDays],
    queryFn: () => window.electronAPI.reports.turnoverAnalysis(turnoverDays),
    staleTime: 1000 * 60 * 5
  })
  const { data: purchaseVsSales } = useQuery<PurchaseVsSalesPoint[]>({
    queryKey: ['reports', 'purchaseVsSales', trendDays, customDates],
    queryFn: () => window.electronAPI.reports.purchaseVsSales(trendDays, customDates?.dateFrom, customDates?.dateTo),
    staleTime: 1000 * 60 * 5
  })
  const { data: abcData } = useQuery<AbcItem[]>({
    queryKey: ['reports', 'abcAnalysis'],
    queryFn: () => window.electronAPI.reports.abcAnalysis(),
    staleTime: 1000 * 60 * 5
  })
  const { data: monthlyPL } = useQuery<MonthlyPLPoint[]>({
    queryKey: ['reports', 'monthlyPL'],
    queryFn: () => window.electronAPI.reports.monthlyPL(),
    staleTime: 1000 * 60 * 5
  })

  return (
    <div className="p-6 space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{r.salesTrend}</h2>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <select
              className="bg-background border border-border rounded px-1.5 py-1 text-xs"
              value={pdfYear}
              onChange={(e) => setPdfYear(Number(e.target.value))}
            >
              {[now.getFullYear()-1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span>{r.year}</span>
            <select
              className="bg-background border border-border rounded px-1.5 py-1 text-xs"
              value={pdfMonth}
              onChange={(e) => setPdfMonth(Number(e.target.value))}
            >
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span>{r.month}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 no-print"
            aria-label="列印報表"
            onClick={() => window.print()}
          >
            <Printer className="w-3 h-3" />
            列印
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            disabled={csvExporting}
            onClick={async () => {
              setCsvExporting(true)
              await window.electronAPI.export.report(trendDays)
              setCsvExporting(false)
            }}
          >
            <FileDown className="w-3 h-3" />
            {csvExporting ? r.exporting : (r.exportReportCsv ?? '匯出報表 CSV')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            disabled={pdfExporting}
            onClick={async () => {
              setPdfExporting(true)
              await window.electronAPI.print.exportMonthlyPdf({ year: pdfYear, month: pdfMonth })
              setPdfExporting(false)
            }}
          >
            <FileDown className="w-3 h-3" />
            {pdfExporting ? r.exporting : r.exportMonthlyPdf}
          </Button>
          <span data-tour="report-range" className="flex gap-1 flex-wrap">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={period === p.value ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => { setPeriod(p.value); localStorage.setItem('ims-reports-range', p.value) }}
              >
                {p.label}
              </Button>
            ))}
          </span>
        </div>
      </div>
      {period === 'custom' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{r.customRange}</span>
          <input
            type="date"
            className="bg-background border border-border rounded px-2 py-1 text-xs w-36"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span>{r.to}</span>
          <input
            type="date"
            className="bg-background border border-border rounded px-2 py-1 text-xs w-36"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          {dateFrom && dateTo && (
            <span className="text-foreground font-medium">{dateFrom} ~ {dateTo}</span>
          )}
        </div>
      )}

      {/* Sales Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{r.salesTrend}（{trendDays}d）</CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading ? <LoadingSpinner /> : trend && trend.length > 0 ? (
            <div role="img" aria-label="銷售趨勢折線圖：所選期間每日營收">
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
              <p className="sr-only">折線圖顯示所選期間每日銷售金額趨勢。</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">{r.noData}</div>
          )}
        </CardContent>
      </Card>

      {/* Purchase vs Sales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{r.purchaseVsSales(trendDays)}</CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseVsSales && purchaseVsSales.length > 0 ? (
            <div role="img" aria-label="採購 vs 銷售比較直條圖：採購金額與銷售金額對比">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={purchaseVsSales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(v: number, name: string) => [formatCurrency(v), name === 'purchase_amount' ? r.purchase : r.salesLabel]}
                  />
                  <Legend
                    formatter={(value) => value === 'purchase_amount' ? r.purchase : r.salesLabel}
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="purchase_amount" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="sales_amount" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="sr-only">分組直條圖對比所選期間採購金額（藍色）與銷售金額（綠色）。</p>
            </div>
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
              <div role="img" aria-label="庫存分類橫向直條圖：各分類商品數、庫存量與庫存價值">
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
                <p className="sr-only">橫向直條圖顯示各商品分類的商品數量、庫存數量與庫存總值。</p>
              </div>
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
                    {['SKU', t.products.title, t.products.category, t.products.stock, r.reorderPoint, r.gap, r.suggestedRestock].map(h => (
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
                    {['SKU', t.products.title, t.products.category, t.products.sellPrice, t.products.buyPrice, r.grossProfit, r.grossMarginPct].map((h) => (
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

      {/* Top Customers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{r.topCustomers}</CardTitle>
        </CardHeader>
        <CardContent>
          {topCustomers && topCustomers.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <div role="img" aria-label="業績排行橫向直條圖：前 10 名客戶銷售金額">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topCustomers.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(v: number) => [formatCurrency(v), r.totalSpend]}
                    />
                    <Bar dataKey="total_spent" radius={[0, 4, 4, 0]}>
                      {topCustomers.slice(0, 5).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="sr-only">橫向直條圖顯示銷售金額前 10 名客戶。</p>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left">{r.rank}</th>
                      <th className="px-3 py-2 text-left">{r.customerName}</th>
                      <th className="px-3 py-2 text-right">{r.orderCount}</th>
                      <th className="px-3 py-2 text-right">{r.totalSpend}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((c, i) => (
                      <tr key={c.customer_id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-2 text-muted-foreground text-xs w-10">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{c.name}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{c.order_count}</td>
                        <td className="px-3 py-2 text-right font-semibold text-green-400">{formatCurrency(c.total_spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">{r.noData}</div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Turnover Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{r.turnoverTitle}</CardTitle>
            <div className="flex gap-1">
              {[7, 30, 90].map((d) => (
                <Button
                  key={d}
                  variant={turnoverDays === d ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setTurnoverDays(d)}
                >
                  {r.daysLabel(d)}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {r.turnoverDesc(turnoverDays)}
          </p>
        </CardHeader>
        <CardContent>
          {!turnover || turnover.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">{r.noDataFallback}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">{r.productName}</th>
                    <th className="text-left px-3 py-2 font-medium font-mono">SKU</th>
                    <th className="text-left px-3 py-2 font-medium">{t.products.category}</th>
                    <th className="text-right px-3 py-2 font-medium">{t.products.stock}</th>
                    <th className="text-right px-3 py-2 font-medium">{r.soldQty}</th>
                    <th className="text-right px-3 py-2 font-medium">{r.turnoverRate}</th>
                    <th className="text-right px-3 py-2 font-medium">{r.estSellout}</th>
                  </tr>
                </thead>
                <tbody>
                  {turnover.map((item) => {
                    const dts = item.days_to_sell
                    const dtsColor = dts === null
                      ? 'text-muted-foreground'
                      : dts <= 7
                        ? 'text-destructive font-semibold'
                        : dts <= 30
                          ? 'text-yellow-400 font-semibold'
                          : 'text-muted-foreground'
                    return (
                      <tr key={item.product_id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{item.name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.sku}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.category}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(item.stock_qty)}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(item.sold_qty)}</td>
                        <td className="px-3 py-2 text-right text-blue-400">
                          {item.turnover_rate !== null ? item.turnover_rate.toFixed(2) : '—'}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums ${dtsColor}`}>
                          {dts !== null ? r.daysUnit(dts) : r.noSales}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slow-Moving Inventory */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{r.slowMovingTitle}</CardTitle>
            <div className="flex gap-1">
              {[30, 60, 90].map((d) => (
                <Button
                  key={d}
                  variant={slowDays === d ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSlowDays(d)}
                >
                  {r.daysLabel(d)}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {r.slowMovingDesc(slowDays)}
          </p>
        </CardHeader>
        <CardContent>
          {!slowMoving || slowMoving.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
              {r.noSlowMoving(slowDays)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">{r.productName}</th>
                    <th className="text-left px-3 py-2 font-medium font-mono">SKU</th>
                    <th className="text-left px-3 py-2 font-medium">{t.products.category}</th>
                    <th className="text-right px-3 py-2 font-medium">{t.products.stock}</th>
                    <th className="text-right px-3 py-2 font-medium">{r.inventoryValue}</th>
                    <th className="text-right px-3 py-2 font-medium">{r.idleDays}</th>
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
                          {r.daysUnit(item.days_idle)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground text-right mt-2 px-3">
                {r.slowMovingSummary(slowMoving.length, formatCurrency(slowMoving.reduce((s, i) => s + i.stock_value, 0)))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly P&L */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">近 12 個月損益</CardTitle>
        </CardHeader>
        <CardContent>
          {!monthlyPL ? (
            <LoadingSpinner />
          ) : (
            <div role="img" aria-label="月損益直條圖：收入、成本與毛利比較">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyPL} barSize={16} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? '營收' : name === 'cost' ? '成本' : '毛利']}
                  />
                  <Legend formatter={(v) => v === 'revenue' ? '營收' : v === 'cost' ? '成本' : '毛利'} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" fill="#3b82f6" opacity={0.7} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="cost" fill="#ef4444" opacity={0.7} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="gross_profit" fill="#10b981" opacity={0.85} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="sr-only">分組直條圖顯示所選月份的銷售收入、採購成本與毛利。</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ABC Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">商品 ABC 分析</CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> A 類：貢獻 70% 營收</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> B 類：貢獻 20%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50 inline-block" /> C 類：其餘 10%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!abcData ? (
            <LoadingSpinner />
          ) : abcData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">尚無銷售資料</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">商品</th>
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">類別</th>
                    <th className="px-3 py-2 text-right font-medium">銷售額</th>
                    <th className="px-3 py-2 text-right font-medium">佔比</th>
                    <th className="px-3 py-2 text-right font-medium">累計</th>
                    <th className="px-3 py-2 text-center font-medium">等級</th>
                  </tr>
                </thead>
                <tbody>
                  {abcData.map((item) => {
                    const cls = item.abc_class
                    const badge = cls === 'A'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : cls === 'B'
                        ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                        : 'bg-muted text-muted-foreground'
                    return (
                      <tr key={item.product_id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{item.name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.sku}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.category}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(item.revenue)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{item.revenue_pct}%</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{item.cumulative_pct}%</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${badge}`}>{cls}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
