import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Package, Truck, Users, ShoppingCart, FileText, X } from 'lucide-react'
import type { SearchResult } from '@/types/schema'

const TYPE_ICONS = {
  product: Package,
  supplier: Truck,
  customer: Users,
  purchase: ShoppingCart,
  sale: FileText
}

const TYPE_ROUTES: Record<string, string> = {
  product: '/products',
  supplier: '/suppliers',
  customer: '/customers',
  purchase: '/purchases',
  sale: '/sales'
}

const TYPE_LABELS: Record<string, string> = {
  product: '商品',
  supplier: '供應商',
  customer: '客戶',
  purchase: '採購單',
  sale: '銷售單'
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length === 0) { setResults([]); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.search.global(q)
      setResults(res)
      setActiveIndex(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 200)
  }

  const handleSelect = (result: SearchResult) => {
    navigate(TYPE_ROUTES[result.type])
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      handleSelect(results[activeIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="搜尋商品、供應商、客戶、訂單..."
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-muted-foreground/40 border-t-muted-foreground rounded-full animate-spin shrink-0" />
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="py-1 max-h-72 overflow-y-auto">
            {results.map((result, i) => {
              const Icon = TYPE_ICONS[result.type]
              return (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === activeIndex ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{result.title}</div>
                      {result.meta && (
                        <div className="text-xs text-muted-foreground truncate">{result.meta}</div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
                      {TYPE_LABELS[result.type]}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Empty state */}
        {query.trim().length > 0 && !loading && results.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            找不到「{query}」相關結果
          </div>
        )}

        {/* Hint */}
        {query.trim().length === 0 && (
          <div className="px-4 py-3 text-xs text-muted-foreground">
            輸入關鍵字搜尋 · <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> 移動 · <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> 跳轉 · <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> 關閉
          </div>
        )}
      </div>
    </div>
  )
}
