import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Package, Truck, Users, ShoppingCart, FileText, X,
  Zap, Plus, ClipboardList, Palette, Languages
} from 'lucide-react'
import type { SearchResult } from '@/types/schema'
import { useLang } from '@/lib/useLang'
import { useThemeStore } from '@/stores/theme.store'
import { useLangStore } from '@/stores/lang.store'

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

interface CommandAction {
  id: string
  labelKey: string
  icon: React.ElementType
  shortcut?: string
  handler: () => void
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const t = useLang()
  const cp = t.commandPalette
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const actions: CommandAction[] = [
    {
      id: 'new-purchase',
      labelKey: 'newPurchase',
      icon: ShoppingCart,
      handler: () => { navigate('/purchases', { state: { openForm: true } }); onClose() }
    },
    {
      id: 'new-sale',
      labelKey: 'newSale',
      icon: FileText,
      handler: () => { navigate('/sales', { state: { openForm: true } }); onClose() }
    },
    {
      id: 'new-product',
      labelKey: 'newProduct',
      icon: Plus,
      handler: () => { navigate('/products', { state: { openForm: true } }); onClose() }
    },
    {
      id: 'new-stocktake',
      labelKey: 'newStockTake',
      icon: ClipboardList,
      handler: () => { navigate('/stock-take', { state: { openForm: true } }); onClose() }
    },
    {
      id: 'toggle-theme',
      labelKey: 'toggleTheme',
      icon: Palette,
      shortcut: '⌘T',
      handler: () => { useThemeStore.getState().toggleTheme(); onClose() }
    },
    {
      id: 'toggle-lang',
      labelKey: 'toggleLang',
      icon: Languages,
      handler: () => { useLangStore.getState().toggleLang(); onClose() }
    }
  ]

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
    // In action-only mode (>) don't search
    if (value.startsWith('>')) {
      setResults([])
      setActiveIndex(0)
      return
    }
    debounceRef.current = setTimeout(() => doSearch(value), 200)
  }

  const handleSelect = (result: SearchResult) => {
    navigate(TYPE_ROUTES[result.type])
    onClose()
  }

  // Determine which actions to show
  const actionFilter = query.startsWith('>')
    ? query.slice(1).trim().toLowerCase()
    : query.trim().toLowerCase()

  const visibleActions = actions.filter((a) => {
    if (!actionFilter) return true
    const label = cp.actions[a.labelKey as keyof typeof cp.actions] ?? ''
    return label.toLowerCase().includes(actionFilter)
  })

  const showResults = !query.startsWith('>') && results.length > 0
  const totalItems = (showResults ? results.length : 0) + visibleActions.length

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (showResults && activeIndex < results.length) {
        handleSelect(results[activeIndex])
      } else {
        const actionIdx = activeIndex - (showResults ? results.length : 0)
        visibleActions[actionIdx]?.handler()
      }
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
            placeholder={cp.placeholder}
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

        <div className="max-h-80 overflow-y-auto">
          {/* Search Results */}
          {showResults && (
            <ul className="py-1">
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
                        {cp.types[result.type as keyof typeof cp.types]}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Actions section */}
          {visibleActions.length > 0 && (
            <>
              {showResults && <div className="border-t border-border mx-3" />}
              <div className="px-4 pt-2 pb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {cp.actionsLabel}
                </span>
              </div>
              <ul className="pb-1">
                {visibleActions.map((action, i) => {
                  const globalIdx = (showResults ? results.length : 0) + i
                  const Icon = action.icon
                  const label = cp.actions[action.labelKey as keyof typeof cp.actions] ?? action.labelKey
                  return (
                    <li key={action.id}>
                      <button
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          globalIdx === activeIndex ? 'bg-primary/10' : 'hover:bg-primary/5'
                        }`}
                        onClick={action.handler}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                      >
                        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{label}</div>
                        </div>
                        {action.shortcut && (
                          <kbd className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono shrink-0">
                            {action.shortcut}
                          </kbd>
                        )}
                        <Zap className="w-3 h-3 text-primary/60 shrink-0" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {/* Empty state */}
          {query.trim().length > 0 && !loading && results.length === 0 && visibleActions.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {cp.noResults(query.startsWith('>') ? query.slice(1).trim() : query)}
            </div>
          )}

          {/* Hint when empty */}
          {query.trim().length === 0 && visibleActions.length === 0 && (
            <div className="px-4 py-3 text-xs text-muted-foreground">
              {cp.hint}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {(showResults || visibleActions.length > 0) && (
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex items-center gap-3">
            <span>{cp.hint}</span>
            {!query.startsWith('>') && (
              <span className="ml-auto opacity-60">輸入 &gt; 只顯示動作</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
