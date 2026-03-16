import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface ProductPickerDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  selectedIds: number[]
  onConfirm: (ids: number[]) => void
}

const MAX_SELECT = 20

export default function ProductPickerDialog({
  open,
  onOpenChange,
  selectedIds,
  onConfirm
}: ProductPickerDialogProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [checked, setChecked] = useState<Set<number>>(new Set(selectedIds))

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => window.electronAPI.products.getAll({}),
    staleTime: 1000 * 60
  })

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  )

  const toggle = (id: number): void => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_SELECT) {
        next.add(id)
      }
      return next
    })
  }

  const handleConfirm = (): void => {
    onConfirm(Array.from(checked))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>選擇要分析的商品（最多 {MAX_SELECT} 項）</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜尋商品名稱或 SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto border rounded-lg divide-y divide-border">
          {filtered.map((p) => {
            const isChecked = checked.has(p.id)
            const isDisabled = !isChecked && checked.size >= MAX_SELECT
            return (
              <label
                key={p.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors',
                  isDisabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Checkbox
                  checked={isChecked}
                  disabled={isDisabled}
                  onCheckedChange={() => toggle(p.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.sku}</div>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  庫存 {p.stock_qty}
                </span>
              </label>
            )
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">找不到符合的商品</div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            已選 {checked.size} / {MAX_SELECT} 項
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={checked.size === 0}>
              確認選擇
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
