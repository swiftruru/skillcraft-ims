import { useState } from 'react'
import { Bookmark, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FilterPreset {
  name: string
  filters: Record<string, string>
}

const MAX_PRESETS = 5

function loadPresets(key: string): FilterPreset[] {
  try {
    const raw = localStorage.getItem(`filter-presets-${key}`)
    return raw ? (JSON.parse(raw) as FilterPreset[]) : []
  } catch {
    return []
  }
}

function savePresets(key: string, presets: FilterPreset[]): void {
  localStorage.setItem(`filter-presets-${key}`, JSON.stringify(presets))
}

interface SavedFiltersProps {
  storageKey: string
  currentFilters: Record<string, string>
  onApply: (filters: Record<string, string>) => void
  saveLabel?: string
}

export function SavedFilters({ storageKey, currentFilters, onApply, saveLabel = '儲存篩選' }: SavedFiltersProps) {
  const [presets, setPresets] = useState<FilterPreset[]>(() => loadPresets(storageKey))
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  const hasActiveFilter = Object.values(currentFilters).some(Boolean)

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const next = [{ name: trimmed, filters: currentFilters }, ...presets.filter((p) => p.name !== trimmed)].slice(0, MAX_PRESETS)
    setPresets(next)
    savePresets(storageKey, next)
    setNaming(false)
    setName('')
  }

  const handleDelete = (presetName: string) => {
    const next = presets.filter((p) => p.name !== presetName)
    setPresets(next)
    savePresets(storageKey, next)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map((preset) => (
        <div
          key={preset.name}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs cursor-pointer hover:bg-muted/80 group"
          onClick={() => onApply(preset.filters)}
        >
          <Bookmark className="w-3 h-3 text-muted-foreground shrink-0" />
          <span>{preset.name}</span>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
            onClick={(e) => { e.stopPropagation(); handleDelete(preset.name) }}
          >
            <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ))}

      {hasActiveFilter && presets.length < MAX_PRESETS && (
        naming ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              className="h-7 px-2 text-xs rounded border border-border bg-background outline-none focus:ring-1 focus:ring-ring w-28"
              placeholder="篩選名稱..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') { setNaming(false); setName('') }
              }}
            />
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleSave}>儲存</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => { setNaming(false); setName('') }}>✕</Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setNaming(true)}
          >
            <Bookmark className="w-3 h-3" />
            {saveLabel}
          </Button>
        )
      )}
    </div>
  )
}
