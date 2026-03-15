import { useState, useRef, useEffect, useId } from 'react'
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
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const listboxId = `${id}-listbox`

  // Sync display text when value changes externally
  const selectedLabel = options.find((o) => o.value === value)?.label ?? ''

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setInputText(selectedLabel)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, selectedLabel])

  // Reset active index when filtered list changes
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(inputText.toLowerCase())
  )
  const showCreate =
    inputText.trim().length > 0 &&
    !options.some((o) => o.label.toLowerCase() === inputText.trim().toLowerCase())

  // All navigable items: filtered options + create option (if shown)
  const itemCount = filtered.length + (showCreate ? 1 : 0)

  const handleFocus = () => {
    if (disabled) return
    setInputText('')
    setOpen(true)
    setActiveIndex(-1)
  }

  const handleBlur = () => {
    // Delay to allow click events on dropdown items to fire first
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false)
        setInputText(selectedLabel)
        setActiveIndex(-1)
      }
    }, 150)
  }

  const handleSelect = (option: CreatableOption) => {
    onValueChange(option.value)
    setInputText(option.label)
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleCreate = async () => {
    if (creating || !inputText.trim()) return
    setCreating(true)
    try {
      const newId = await onCreate(inputText.trim())
      onValueChange(newId)
      setOpen(false)
      setActiveIndex(-1)
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setInputText(selectedLabel)
      setActiveIndex(-1)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setActiveIndex((prev) => Math.min(prev + 1, itemCount - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        handleSelect(filtered[activeIndex])
      } else if (activeIndex === filtered.length && showCreate) {
        handleCreate()
      } else if (filtered.length === 1) {
        handleSelect(filtered[0])
      } else if (showCreate) {
        handleCreate()
      }
    }
  }

  const activeOptionId = activeIndex >= 0
    ? `${id}-option-${activeIndex}`
    : undefined

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
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder={open ? '搜尋或輸入名稱...' : placeholder}
          value={open ? inputText : (selectedLabel || '')}
          onChange={(e) => { setInputText(e.target.value); setActiveIndex(-1) }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          readOnly={!open}
        />
        {creating
          ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" aria-hidden="true" />
          : <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        }
      </div>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-card shadow-lg"
        >
          {filtered.length === 0 && !showCreate && (
            <div role="status" className="px-3 py-2 text-sm text-muted-foreground">無符合選項</div>
          )}
          {filtered.map((option, idx) => (
            <div
              key={option.value}
              id={`${id}-option-${idx}`}
              role="option"
              aria-selected={option.value === value}
              className={cn(
                'w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors',
                activeIndex === idx ? 'bg-accent' : 'hover:bg-accent'
              )}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(option) }}
            >
              {option.label}
            </div>
          ))}
          {showCreate && (
            <div
              id={`${id}-option-${filtered.length}`}
              role="option"
              aria-selected={false}
              className={cn(
                'w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-primary cursor-pointer transition-colors border-t border-border',
                activeIndex === filtered.length ? 'bg-primary/10' : 'hover:bg-primary/5'
              )}
              onMouseDown={(e) => { e.preventDefault(); handleCreate() }}
              aria-disabled={creating}
            >
              {creating
                ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
                : <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              }
              {createLabel(inputText.trim())}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
