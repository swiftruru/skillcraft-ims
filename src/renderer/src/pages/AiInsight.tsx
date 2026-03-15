import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Brain, AlertCircle, Settings, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useLang } from '@/lib/useLang'
import { useToast } from '@/components/ui/use-toast'
import { AiForecastResult } from '@/types/schema'
import { cn } from '@/lib/utils'

export default function AiInsight(): JSX.Element {
  const t = useLang()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [aiError, setAiError] = useState<string | null>(null)

  // Load persisted forecast from DB on mount
  const { data: forecast, isLoading: isLoadingLatest } = useQuery<AiForecastResult | null>({
    queryKey: ['ai', 'latest'],
    queryFn: () => window.electronAPI.ai.getLatest(),
    staleTime: Infinity
  })

  const mutation = useMutation({
    mutationFn: () => window.electronAPI.ai.forecast(),
    onSuccess: () => {
      setAiError(null)
      queryClient.invalidateQueries({ queryKey: ['ai', 'latest'] })
    },
    onError: (err: Error) => {
      const msg = err.message ?? t.ai.errorRetry
      setAiError(msg)
      toast({ title: msg, variant: 'destructive' })
    }
  })

  const isNoApiKey = aiError?.includes('API Key') || aiError?.includes('api key')
  const isNoData = aiError?.includes('無銷售') || aiError?.includes('No sales')

  const formatDate = (iso: string): string => new Date(iso).toLocaleString()

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">{t.ai.title}</h1>
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="gap-2"
        >
          {mutation.isPending ? t.ai.generating : t.ai.generate}
        </Button>
      </div>

      {/* Initial loading from DB */}
      {isLoadingLatest && <LoadingSpinner />}

      {/* Generating spinner */}
      {mutation.isPending && <LoadingSpinner />}

      {/* Error */}
      {aiError && !mutation.isPending && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-sm text-destructive">{aiError}</p>
              {isNoApiKey && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="w-3.5 h-3.5" />
                  {t.ai.goToSettings}
                </Button>
              )}
              {!isNoApiKey && !isNoData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                >
                  {t.ai.generate}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state — no DB record and no error */}
      {!isLoadingLatest && !forecast && !mutation.isPending && !aiError && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Brain className="w-16 h-16 text-muted-foreground/20" />
          <p className="text-base font-medium">{t.ai.empty}</p>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {t.ai.generate}
          </Button>
        </div>
      )}

      {/* Results */}
      {forecast && !mutation.isPending && (
        <>
          {/* Summary card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.ai.summary}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <p className="text-sm">{forecast.summary}</p>
              <p className="text-xs text-muted-foreground">
                {t.ai.lastGenerated(formatDate(forecast.generatedAt))}
              </p>
            </CardContent>
          </Card>

          {/* Result table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm" aria-label={t.ai.title}>
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">{t.ai.colProduct}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{t.ai.colStock}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{t.ai.colDaysLeft}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{t.ai.colSuggestQty}</th>
                  <th className="text-left px-4 py-2.5 font-medium">{t.ai.colReasoning}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {forecast.items.map((item) => {
                  const urgentDays = item.days_remaining !== null && item.days_remaining < 7
                  return (
                    <tr key={item.product_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.stock_qty}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {item.days_remaining === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={cn(urgentDays && 'text-orange-500 font-medium')}>
                            {item.days_remaining}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {item.suggested_reorder_qty === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          item.suggested_reorder_qty
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs">
                        {item.reasoning}
                      </td>
                      <td className="px-4 py-3">
                        {item.suggested_reorder_qty > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 whitespace-nowrap"
                            onClick={() =>
                              navigate('/purchases', { state: { openForm: true } })
                            }
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            {t.ai.createPurchase}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
