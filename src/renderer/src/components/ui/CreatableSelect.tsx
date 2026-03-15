import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CreatableOption {
  value: string
  label: string
}

interface CreatableSelectProps {
  options: CreatableOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  createLabel?: (input: string) => string
  onCreate: (name: string) => Promise<string>
  disabled?: boolean
  className?: string
}

export function CreatableSelect({
  options,
  value,
  onValueChange,
  placeholder = '請選擇或輸入...',
  createLabel = (v) => `新增「${v}」`,
  onCreate,
  disabled,
  className
}: CreatableSelectProps) {
  const [open, setOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync display text when value changes externally
  const selectedLabel = options.find((o) => o.value === value)?.label ?? ''

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setInputText(selectedLabel)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, selectedLabel])

  const handleFocus = () => {
    if (disabled) return
    setInputText('')
    setOpen(true)
  }

  const handleBlur = () => {
    // Delay to allow click events on dropdown items to fire first
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false)
        setInputText(selectedLabel)
      }
    }, 150)
  }

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(inputText.toLowerCase())
  )

  const showCreate =
    inputText.trim().length > 0 &&
    !options.some((o) => o.label.toLowerCase() === inputText.trim().toLowerCase())

  const handleSelect = (option: CreatableOption) => {
    onValueChange(option.value)
    setInputText(option.label)
    setOpen(false)
  }

  const handleCreate = async () => {
    if (creating || !inputText.trim()) return
    setCreating(true)
    try {
      const newId = await onCreate(inputText.trim())
      onValueChange(newId)
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setInputText(selectedLabel) }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length === 1) { handleSelect(filtered[0]) }
      else if (showCreate) { handleCreate() }
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors',
          'focus-within:ring-1 focus-within:ring-ring',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder={open ? '搜尋或輸入名稱...' : placeholder}
          value={open ? inputText : (selectedLabel || '')}
          onChange={(e) => setInputText(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          readOnly={!open}
        />
        {creating
          ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
          : <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
        }
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {filtered.length === 0 && !showCreate && (
            <div className="px-3 py-2 text-sm text-muted-foreground">無符合選項</div>
          )}
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(option) }}
            >
              {option.label}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors border-t border-border"
              onMouseDown={(e) => { e.preventDefault(); handleCreate() }}
              disabled={creating}
            >
              {creating
                ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                : <Plus className="w-3.5 h-3.5 shrink-0" />
              }
              {createLabel(inputText.trim())}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
