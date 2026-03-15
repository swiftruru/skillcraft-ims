import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Wand2, Package, X } from 'lucide-react'
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '@/lib/constants'
import type { Product } from '@/types/schema'
import { useLang } from '@/lib/useLang'

const MOCK_DATA = [
  { sku: '', name: 'USB-C 充電器 65W', category: '電子產品', sell_price: 890, buy_price: 450, stock_qty: 50, reorder_pt: 10, unit: '個', description: '支援 PD 快充，適用於筆電及手機' },
  { sku: '', name: '無線藍牙滑鼠', category: '電腦周邊', sell_price: 590, buy_price: 280, stock_qty: 30, reorder_pt: 5, unit: '個', description: '2.4G 無線連接，長效電池' },
  { sku: '', name: 'A4 影印紙 500 張', category: '文具', sell_price: 180, buy_price: 90, stock_qty: 200, reorder_pt: 30, unit: '包', description: '80g 高白紙，適合雷射/噴墨印表機' },
  { sku: '', name: '氣泡布捲 50m', category: '包裝材料', sell_price: 320, buy_price: 150, stock_qty: 80, reorder_pt: 10, unit: '捲', description: '防震氣泡布，適合易碎品包裝' },
  { sku: '', name: '工業手套 L 號', category: '雜項', sell_price: 120, buy_price: 55, stock_qty: 80, reorder_pt: 15, unit: '件', description: '防靜電、耐磨設計' },
]

const schema = z.object({
  sku: z.string().min(1, 'SKU 必填'),
  name: z.string().min(1, '商品名稱必填'),
  category: z.string().min(1, '類別必填'),
  sell_price: z.coerce.number().min(0, '售價不能為負'),
  buy_price: z.coerce.number().min(0, '進價不能為負'),
  stock_qty: z.coerce.number().int().min(0, '庫存不能為負'),
  reorder_pt: z.coerce.number().int().min(0, '補貨點不能為負'),
  unit: z.string().min(1, '單位必填'),
  description: z.string().optional()
})

type FormValues = z.infer<typeof schema>

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSaved?: (id: number) => void
}

export function ProductForm({ open, onOpenChange, product, onSaved }: ProductFormProps) {
  const queryClient = useQueryClient()
  const t = useLang()
  const tf = t.forms
  const isEdit = !!product
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [imgSaving, setImgSaving] = useState(false)
  const [imgError, setImgError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const { data: savedImage } = useQuery<string | null>({
    queryKey: ['products', 'image', product?.id],
    queryFn: () => window.electronAPI.products.getImage(product!.id),
    enabled: isEdit && !!product?.id,
    staleTime: 1000 * 60 * 5
  })

  useEffect(() => {
    setImgPreview(savedImage ?? null)
  }, [savedImage])

  const MAX_FILE_MB = 10
  const compressAndUpload = async (file: File) => {
    if (!product?.id) return
    setImgError(null)
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setImgError(`檔案過大（${(file.size / 1024 / 1024).toFixed(1)} MB），請選擇 ${MAX_FILE_MB} MB 以內的圖片`)
      return
    }
    setImgSaving(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target!.result as string)
        reader.onerror = () => reject(new Error('檔案讀取失敗'))
        reader.readAsDataURL(file)
      })
      setImgPreview(dataUrl)
      const base64 = await new Promise<string>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const MAX = 400
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = img.width * scale
          canvas.height = img.height * scale
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        img.onerror = () => reject(new Error('圖片處理失敗'))
        img.src = dataUrl
      })
      setImgPreview(base64)
      await window.electronAPI.products.setImage(product.id, base64)
      queryClient.invalidateQueries({ queryKey: ['products', 'image', product.id] })
    } catch (e) {
      setImgError(e instanceof Error ? e.message : '上傳失敗，請重試')
      setImgPreview(null)
    } finally {
      setImgSaving(false)
    }
  }

  const clearImage = async () => {
    if (!product?.id) return
    setImgPreview(null)
    await window.electronAPI.products.setImage(product.id, null)
    queryClient.invalidateQueries({ queryKey: ['products', 'image', product.id] })
  }

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: '',
      name: '',
      category: '電子產品',
      sell_price: 0,
      buy_price: 0,
      stock_qty: 0,
      reorder_pt: 10,
      unit: '個',
      description: ''
    }
  })

  useEffect(() => {
    if (product) {
      reset({
        sku: product.sku,
        name: product.name,
        category: product.category,
        sell_price: product.sell_price,
        buy_price: product.buy_price,
        stock_qty: product.stock_qty,
        reorder_pt: product.reorder_pt,
        unit: product.unit,
        description: product.description ?? ''
      })
    } else {
      reset({
        sku: '',
        name: '',
        category: '電子產品',
        sell_price: 0,
        buy_price: 0,
        stock_qty: 0,
        reorder_pt: 10,
        unit: '個',
        description: ''
      })
    }
  }, [product, reset])

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      isEdit
        ? window.electronAPI.products.update(product!.id, data)
        : window.electronAPI.products.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      onOpenChange(false)
      if (result && typeof result === 'object' && 'id' in result) {
        onSaved?.((result as { id: number }).id)
      }
    }
  })

  const onSubmit = (data: FormValues) => mutation.mutate(data)

  const fillMock = () => {
    const m = MOCK_DATA[Math.floor(Math.random() * MOCK_DATA.length)]
    const prefixMap: Record<string, string> = { '電子產品': 'ELEC', '電腦周邊': 'PERI', '文具': 'STAT', '包裝材料': 'PKG', '雜項': 'MISC', '未分類': 'MISC' }
    const prefix = prefixMap[m.category] ?? 'MISC'
    reset({ ...m, sku: `${prefix}-${Math.floor(Math.random() * 900 + 100)}` })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? tf.editProduct : tf.addProduct}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isEdit && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground/70">商品圖片</p>
              <div
                className={`flex items-center gap-4 rounded-lg border-2 border-dashed p-3 transition-colors cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:border-border/80'}`}
                onClick={() => !imgSaving && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f && f.type.startsWith('image/')) compressAndUpload(f)
                }}
              >
                <div className="relative group w-16 h-16 shrink-0 rounded-md border border-border bg-background flex items-center justify-center overflow-hidden">
                  {imgPreview ? (
                    <img src={imgPreview} alt="product" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-7 h-7 text-muted-foreground/30" />
                  )}
                  {imgPreview && !imgSaving && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clearImage() }}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {imgSaving && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center text-[10px] text-muted-foreground">儲存中...</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {isDragging ? (
                    <p className="text-primary font-medium">放開以上傳圖片</p>
                  ) : imgPreview ? (
                    <>
                      <p className="text-foreground/60">已上傳圖片</p>
                      <p>點擊或拖曳新圖片可替換</p>
                      <p>Hover 縮圖可刪除</p>
                    </>
                  ) : (
                    <>
                      <p className="text-foreground/60">點擊選擇或直接拖曳圖片至此</p>
                      <p>支援 JPG、PNG、WebP 等格式</p>
                      <p>上限 10 MB，自動壓縮至 400×400</p>
                    </>
                  )}
                </div>
              </div>
              {imgError && (
                <p className="text-xs text-destructive">{imgError}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) compressAndUpload(f); e.target.value = '' }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sku">{tf.skuLabel}</Label>
              <div className="flex gap-2">
                <Input id="sku" {...register('sku')} placeholder={tf.skuPlaceholder} disabled={isEdit} className="flex-1" />
                {!isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    title={tf.autoSku}
                    onClick={async () => {
                      const category = watch('category')
                      if (!category) return
                      const sku = await window.electronAPI.products.nextSku(category)
                      setValue('sku', sku)
                    }}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">{tf.nameLabel}</Label>
              <Input id="name" {...register('name')} placeholder={tf.namePlaceholder} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{tf.categoryLabel}</Label>
              <Select
                value={watch('category')}
                onValueChange={(v) => setValue('category', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{tf.unitLabel}</Label>
              <Select value={watch('unit')} onValueChange={(v) => setValue('unit', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sell_price">{tf.sellPriceLabel}</Label>
              <Input
                id="sell_price"
                type="number"
                {...register('sell_price')}
                min={0}
                step={1}
              />
              {errors.sell_price && <p className="text-xs text-destructive">{errors.sell_price.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buy_price">{tf.buyPriceLabel}</Label>
              <Input
                id="buy_price"
                type="number"
                {...register('buy_price')}
                min={0}
                step={1}
              />
              {errors.buy_price && <p className="text-xs text-destructive">{errors.buy_price.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="stock_qty">{tf.initialStock}</Label>
              <Input
                id="stock_qty"
                type="number"
                {...register('stock_qty')}
                min={0}
                disabled={isEdit}
              />
              {isEdit && <p className="text-xs text-muted-foreground">{tf.stockAutoUpdated}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reorder_pt">{tf.reorderPtLabel}</Label>
              <Input
                id="reorder_pt"
                type="number"
                {...register('reorder_pt')}
                min={0}
              />
              <p className="text-xs text-muted-foreground">{tf.reorderPtDesc}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">{tf.descriptionLabel}</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={tf.descriptionPlaceholder}
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2">
            {!isEdit && (
              <Button type="button" variant="outline" onClick={fillMock} className="mr-auto gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />{t.common.mockData}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isEdit ? tf.submitUpdate : tf.submitAdd}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
