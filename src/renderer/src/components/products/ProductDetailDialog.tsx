import { useMemo } from 'react'
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts'
import type { Product, InventoryAdjustment } from '@/types/schema'
import { formatCurrency } from '@/lib/utils'

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
  const { data: history, isLoading } = useQuery<InventoryAdjustment[]>({
    queryKey: ['products', 'adjustments', product?.id],
    queryFn: () => window.electronAPI.products.getAdjustmentHistory(product!.id),
    enabled: open && product !== null
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
          <DialogTitle className="flex items-center gap-2">
            {product.name}
            {isLowStock && (
              <Badge variant="destructive" className="text-xs">低庫存</Badge>
            )}
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">{product.sku} · {product.category}</p>
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

        {/* Chart */}
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

        {/* Adjustment list */}
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
      </DialogContent>
    </Dialog>
  )
}
