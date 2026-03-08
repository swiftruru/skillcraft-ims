import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileUp, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Result = {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  error?: string
}

export function ImportCsvDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const handleImport = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await window.electronAPI.import.csv()
      setResult(res)
      if (res.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ['products'] })
      }
    } catch (err) {
      setResult({ success: false, imported: 0, skipped: 0, errors: [(err as Error).message] })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>匯入商品 CSV</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              選擇 CSV 檔案批次匯入商品。若 SKU 已存在，則更新該商品資料。
            </p>

            {/* Format guide */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
              <p className="text-xs font-medium text-foreground">CSV 欄位說明</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span><span className="text-foreground font-mono">SKU / 品號</span>（必填）</span>
                <span><span className="text-foreground font-mono">商品名稱 / 品名</span>（必填）</span>
                <span><span className="text-foreground font-mono">類別 / category</span></span>
                <span><span className="text-foreground font-mono">售價 / sell_price</span></span>
                <span><span className="text-foreground font-mono">進價 / buy_price</span></span>
                <span><span className="text-foreground font-mono">庫存 / stock_qty</span></span>
                <span><span className="text-foreground font-mono">補貨點 / reorder_pt</span></span>
                <span><span className="text-foreground font-mono">單位 / unit</span></span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">支援 Excel 匯出的 UTF-8 BOM 格式；超過 50 筆時自動備份資料庫。</p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>取消</Button>
              <Button onClick={handleImport} disabled={loading} className="gap-2">
                <FileUp className="w-4 h-4" />
                {loading ? '匯入中...' : '選擇 CSV 檔案'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Summary */}
            <div className="flex items-start gap-3">
              {result.success && result.imported > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              ) : result.error ? (
                <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
              )}
              <div className="space-y-0.5">
                {result.error ? (
                  <p className="text-sm font-medium text-destructive">{result.error}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      匯入完成：{result.imported} 筆成功
                      {result.skipped > 0 && `，${result.skipped} 筆跳過`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      商品清單已自動更新
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Error list */}
            {result.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium text-destructive mb-1.5">錯誤明細</p>
                <ul className="space-y-0.5">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-destructive/80">{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>關閉</Button>
              <Button onClick={() => { setResult(null) }} className="gap-2">
                <FileUp className="w-4 h-4" />
                再次匯入
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
