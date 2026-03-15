import { useState, useMemo, useEffect, useRef } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/useLang'

export interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  className?: string
  render?: (value: unknown, row: T) => React.ReactNode
  header?: () => React.ReactNode
  hideable?: boolean
}

type Density = 'compact' | 'normal' | 'relaxed'

const DENSITY_CLASS: Record<Density, string> = {
  compact: 'py-1 text-xs',
  normal: 'py-2.5 text-sm',
  relaxed: 'py-4 text-sm'
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  emptyMessage?: string
  emptyState?: React.ReactNode
  pageSize?: number
  storageKey?: string
  onRowContextMenu?: (row: T, e: React.MouseEvent) => void
  onRowFocus?: (row: T) => void
  flashRowId?: number | string | null
  density?: Density
}

type SortDir = 'asc' | 'desc' | null

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  emptyMessage = '沒有資料',
  emptyState,
  pageSize = 15,
  storageKey,
  onRowContextMenu,
  onRowFocus,
  flashRowId,
  density = 'normal'
}: DataTableProps<T>) {
  const t = useLang()
  const validColKeys = useMemo(() => new Set(columns.map((c) => String(c.key))), [columns])

  const loadSavedSort = () => {
    if (!storageKey) return { key: null as string | null, dir: null as SortDir }
    try {
      const raw = localStorage.getItem(`dt-sort-${storageKey}`)
      if (!raw) return { key: null, dir: null }
      const saved = JSON.parse(raw) as { key: string; dir: SortDir }
      const colKeys = new Set(columns.map((c) => String(c.key)))
      if (!colKeys.has(saved.key)) return { key: null, dir: null }
      return { key: saved.key, dir: saved.dir }
    } catch { return { key: null, dir: null } }
  }

  const savedSort = useMemo(loadSavedSort, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [sortKey, setSortKey] = useState<string | null>(savedSort.key)
  const [sortDir, setSortDir] = useState<SortDir>(savedSort.dir)

  const [page, setPage] = useState(1)
  const [showColMenu, setShowColMenu] = useState(false)
  const colMenuRef = useRef<HTMLDivElement>(null)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const focusedRowRef = useRef<HTMLTableRowElement | null>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const hideableColumns = columns.filter((c) => c.hideable)

  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    if (!storageKey) return new Set()
    try {
      const raw = localStorage.getItem(`dt-cols-${storageKey}`)
      return raw ? new Set<string>(JSON.parse(raw)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(`dt-cols-${storageKey}`, JSON.stringify(Array.from(hiddenCols)))
  }, [hiddenCols, storageKey])

  useEffect(() => {
    if (!storageKey) return
    if (sortKey && sortDir) {
      localStorage.setItem(`dt-sort-${storageKey}`, JSON.stringify({ key: sortKey, dir: sortDir }))
    } else {
      localStorage.removeItem(`dt-sort-${storageKey}`)
    }
  }, [sortKey, sortDir, storageKey])

  // Close col menu on outside click
  useEffect(() => {
    if (!showColMenu) return
    const handler = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setShowColMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColMenu])

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIdx >= 0 && focusedRowRef.current) {
      focusedRowRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIdx])

  const visibleColumns = columns.filter((c) => !hiddenCols.has(String(c.key)))

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)
  const showPagination = sorted.length > pageSize

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortKey(null)
      setSortDir(null)
    }
    setPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!onRowFocus) return
    const len = paginated.length
    if (len === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIdx((i) => Math.min(i + 1, len - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setFocusedIdx(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setFocusedIdx(len - 1)
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault()
      onRowFocus(paginated[focusedIdx])
    }
  }

  if (data.length === 0) {
    if (emptyState) return <>{emptyState}</>
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      className="w-full outline-none"
      tabIndex={onRowFocus ? 0 : undefined}
      onKeyDown={onRowFocus ? handleKeyDown : undefined}
      onBlur={() => setFocusedIdx(-1)}
      ref={tableContainerRef}
    >
      {hideableColumns.length > 0 && (
        <div className="flex justify-end px-3 pt-2 pb-1">
          <div className="relative" ref={colMenuRef}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowColMenu((v) => !v)}
            >
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
            {showColMenu && (
              <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[160px]">
                <p className="text-xs font-medium text-muted-foreground px-2 pb-1.5">顯示欄位</p>
                <div className="space-y-0.5">
                  {hideableColumns.map((col) => {
                    const key = String(col.key)
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={!hiddenCols.has(key)}
                          onCheckedChange={(checked) => {
                            setHiddenCols((prev) => {
                              const next = new Set(prev)
                              if (checked) next.delete(key)
                              else next.add(key)
                              return next
                            })
                          }}
                        />
                        {col.label}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {visibleColumns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-3 text-left font-medium text-muted-foreground',
                    col.sortable && 'cursor-pointer select-none hover:text-foreground',
                    col.className
                  )}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-1">
                    {col.header ? col.header() : col.label}
                    {col.sortable && (
                      <span className="opacity-50">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, idx) => {
              const rowKey = String(row[keyField])
              const isFocused = focusedIdx === idx
              const isFlash = flashRowId != null && String(flashRowId) === rowKey
              return (
                <tr
                  key={rowKey}
                  ref={isFocused ? focusedRowRef : undefined}
                  data-focused={isFocused ? 'true' : undefined}
                  className={cn(
                    'border-b border-border/50 hover:bg-muted/30 transition-colors',
                    isFocused && 'ring-1 ring-inset ring-ring bg-muted/20',
                    isFlash && 'animate-flash'
                  )}
                  onContextMenu={onRowContextMenu ? (e) => onRowContextMenu(row, e) : undefined}
                  onClick={onRowFocus ? () => { setFocusedIdx(idx); onRowFocus(row) } : undefined}
                >
                  {visibleColumns.map((col) => {
                    const value = row[String(col.key)]
                    return (
                      <td key={String(col.key)} className={cn('px-4', DENSITY_CLASS[density], col.className)}>
                        {col.render ? col.render(value, row) : String(value ?? '-')}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span>{t.common.pagination(page, totalPages, sorted.length)}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
