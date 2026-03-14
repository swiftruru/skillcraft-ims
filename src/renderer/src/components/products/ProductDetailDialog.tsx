import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts'
import type { Product, InventoryAdjustment, PriceHistoryItem } from '@/types/schema'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

interface DayPoint {
  date: string
  net: number
}

function buildDailyChart(history: InventoryAdjustment[]): DayPoint[] {
  const map = new Map<string, number>()
  for (const rec of history) {
    const day = rec.adjusted_at.slice(0, 10)
    map.set(day, (map.get(day) ?? 0) + rec.delta)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, net]) => ({ date: date.slice(5), net }))
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

export function ProductDetailDialog({ open, onOpenChange, product }: Props) {
  const [activeTab, setActiveTab] = useState<'adjustments' | 'priceHistory'>('adjustments')

  const { data: history, isLoading } = useQuery<InventoryAdjustment[]>({
    queryKey: ['products', 'adjustments', product?.id],
    queryFn: () => window.electronAPI.products.getAdjustmentHistory(product!.id),
    enabled: open && product !== null
  })

  const { data: productImage } = useQuery<string | null>({
    queryKey: ['products', 'image', product?.id],
    queryFn: () => window.electronAPI.products.getImage(product!.id),
    enabled: open && product !== null,
    staleTime: 1000 * 60 * 5
  })

  const { data: priceHistory, isLoading: priceLoading } = useQuery<PriceHistoryItem[]>({
    queryKey: ['products', 'priceHistory', product?.id],
    queryFn: () => window.electronAPI.products.getPriceHistory(product!.id),
    enabled: open && product !== null && activeTab === 'priceHistory',
    staleTime: 1000 * 60 * 5
  })

  const chartData = useMemo(() => buildDailyChart(history ?? []), [history])

  const totalIn = useMemo(
    () => (history ?? []).filter((r) => r.delta > 0).reduce((s, r) => s + r.delta, 0),
    [history]
  )
  const totalOut = useMemo(
    () => (history ?? []).filter((r) => r.delta < 0).reduce((s, r) => s + r.delta, 0),
    [history]
  )

  const priceChartData = useMemo(
    () =>
      (priceHistory ?? [])
        .slice()
        .reverse()
        .map((p) => ({ date: p.order_date.slice(5), price: p.unit_price })),
    [priceHistory]
  )

  if (!product) return null

  const stockValue = product.stock_qty * product.buy_price
  const margin = product.sell_price > 0
    ? Math.round(((product.sell_price - product.buy_price) / product.sell_price) * 100)
    : 0
  const isLowStock = product.stock_qty <= product.reorder_pt

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {productImage && (
              <img
                src={productImage}
                alt={product.name}
                className="w-14 h-14 rounded-lg object-cover border border-border shrink-0"
              />
            )}
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                {product.name}
                {isLowStock && (
                  <Badge variant="destructive" className="text-xs">低庫存</Badge>
                )}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono">{product.sku} · {product.category}</p>
            </div>
          </div>
        </DialogHeader>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            label="現有庫存"
            value={`${product.stock_qty} ${product.unit}`}
            sub={`補貨點 ${product.reorder_pt}`}
          />
          <StatCard
            label="庫存價值"
            value={formatCurrency(stockValue)}
            sub={`進價 ${formatCurrency(product.buy_price)}`}
          />
          <StatCard
            label="毛利率"
            value={`${margin}%`}
            sub={`售價 ${formatCurrency(product.sell_price)}`}
          />
          <StatCard
            label="總調整次數"
            value={String(history?.length ?? 0)}
            sub={`入 +${totalIn}　出 ${totalOut}`}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {([['adjustments', '庫存異動'], ['priceHistory', '採購價格']] as const).map(([key, label]) => (
            <button
              key={key}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: 庫存異動 */}
        {activeTab === 'adjustments' && (
          <>
            {isLoading ? (
              <LoadingSpinner />
            ) : chartData.length > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">近 30 天每日庫存淨異動</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                      cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                      formatter={(v: number) => [v > 0 ? `+${v}` : v, '淨異動']}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.net >= 0 ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">尚無庫存異動記錄</p>
            )}

            {history && history.length > 0 && (
              <div className="max-h-52 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">時間</th>
                      <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-16">異動量</th>
                      <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">原因</th>
                      <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">備註</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {history.map((rec) => (
                      <tr key={rec.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {rec.adjusted_at.replace('T', ' ').slice(0, 16)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">
                          <span className={rec.delta > 0 ? 'text-green-400' : 'text-destructive'}>
                            {rec.delta > 0 ? `+${rec.delta}` : rec.delta}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{rec.reason}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{rec.note ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Tab: 採購價格 */}
        {activeTab === 'priceHistory' && (
          <>
            {priceLoading ? (
              <LoadingSpinner />
            ) : priceChartData.length > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">採購單價歷史趨勢</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={priceChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                      formatter={(v: number) => [formatCurrency(v), '單價']}
                    />
                    <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">尚無採購記錄</p>
            )}

            {priceHistory && priceHistory.length > 0 && (
              <div className="max-h-52 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">日期</th>
                      <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">訂單號</th>
                      <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">數量</th>
                      <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">單價</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {priceHistory.map((rec, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(rec.order_date)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{rec.order_no}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{rec.quantity}</td>
                        <td className="px-3 py-2 text-right font-semibold text-blue-400">{formatCurrency(rec.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
