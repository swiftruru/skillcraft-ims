import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Package } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface PurchaseTemplateItem {
  product_id: number
  product_name: string
  product_sku: string
  quantity: number
  unit_price: number
  discount_pct: number
}

export interface PurchaseTemplate {
  id: number
  name: string
  supplier_id: number | null
  supplier_name: string | null
  notes: string | null
  created_at: string
  items: PurchaseTemplateItem[]
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSelect: (template: PurchaseTemplate) => void
}

export function PurchaseTemplateDialog({ open, onOpenChange, onSelect }: Props) {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<PurchaseTemplate | null>(null)

  const { data: templates = [], isLoading } = useQuery<PurchaseTemplate[]>({
    queryKey: ['purchaseTemplates'],
    queryFn: () => window.electronAPI.purchases.getTemplates(),
    enabled: open
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.purchases.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseTemplates'] })
      setDeleteTarget(null)
    }
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>載入範本</DialogTitle>
          </DialogHeader>

          <div className="min-h-[120px]">
            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">載入中…</p>
            )}
            {!isLoading && templates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Package className="w-8 h-8 opacity-30" />
                <p className="text-sm">尚無已儲存的範本</p>
                <p className="text-xs">在採購表單中填入品項後，點「另存為範本」即可新增</p>
              </div>
            )}
            {!isLoading && templates.length > 0 && (
              <ul className="space-y-1.5">
                {templates.map((tpl) => (
                  <li
                    key={tpl.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tpl.supplier_name ?? '不指定供應商'} · {tpl.items.length} 項商品
                      </p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => onSelect(tpl)}
                    >
                      選取
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      onClick={() => setDeleteTarget(tpl)}
                      aria-label={`刪除範本：${tpl.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>確認刪除範本</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            確定要刪除「{deleteTarget?.name}」嗎？此操作無法復原，但不會影響現有採購單。
          </p>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
