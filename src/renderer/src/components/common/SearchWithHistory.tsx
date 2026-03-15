import { useState, useRef } from 'react'
import { Search, History, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useRecentSearches } from '@/lib/useRecentSearches'

interface SearchWithHistoryProps {
  value: string
  onChange: (v: string) => void
  onSubmit?: (v: string) => void
  placeholder?: string
  storageKey: string
  className?: string
}

export function SearchWithHistory({
  value,
  onChange,
  onSubmit,
  placeholder,
  storageKey,
  className
}: SearchWithHistoryProps) {
  const { recentSearches, addSearch, removeOne, clearAll } = useRecentSearches(storageKey)
  const [open, setOpen] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFocus = () => {
    if (value === '') setOpen(true)
  }

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 150)
  }

  const handleChange = (v: string) => {
    onChange(v)
    setOpen(v === '' && recentSearches.length > 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addSearch(value)
      setOpen(false)
      onSubmit?.(value)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const pickRecent = (q: string) => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    onChange(q)
    setOpen(false)
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        className="pl-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {open && recentSearches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg py-1">
          <div className="flex items-center justify-between px-3 pb-1">
            <span className="text-xs text-muted-foreground">最近搜尋</span>
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onMouseDown={(e) => { e.preventDefault(); clearAll() }}
            >
              清除全部
            </button>
          </div>
          {recentSearches.map((q) => (
            <div
              key={q}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer group"
              onMouseDown={(e) => { e.preventDefault(); pickRecent(q) }}
            >
              <History className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm truncate">{q}</span>
              <button
                className="opacity-0 group-hover:opacity-100"
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); removeOne(q) }}
              >
                <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
