import { useEffect } from 'react'
import { useLang } from '@/lib/useLang'
import { modKey } from '@/lib/platform'
import { X } from 'lucide-react'

interface ShortcutOverlayProps {
  open: boolean
  onClose: () => void
}

interface ShortcutEntry {
  label: string
  keys: string[][]
}

interface ShortcutGroup {
  title: string
  items: ShortcutEntry[]
}

function Kbd({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-0.5">
      {keys.map((k, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && <span className="text-muted-foreground text-xs mx-0.5">then</span>}
          <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground leading-none">
            {k}
          </kbd>
        </span>
      ))}
    </span>
  )
}

export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
  const t = useLang()
  const sc = t.shortcuts

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const groups: ShortcutGroup[] = [
    {
      title: '全域操作',
      items: [
        { label: sc.globalSearch, keys: [[`${modKey}K`]] },
        { label: sc.showShortcuts, keys: [['?']] },
        { label: sc.closeDialog, keys: [['Esc']] },
        { label: sc.newItem, keys: [['N']] },
      ]
    },
    {
      title: '頁面導覽',
      items: [
        { label: sc.goHome, keys: [['G', 'H']] },
        { label: sc.goProducts, keys: [['G', 'P']] },
        { label: sc.goPurchases, keys: [['G', 'B']] },
        { label: sc.goSales, keys: [['G', 'S']] },
        { label: sc.goReports, keys: [['G', 'R']] },
        { label: sc.goSettings, keys: [['G', ',']] },
      ]
    },
    {
      title: '表格操作',
      items: [
        { label: '移動選取列', keys: [['↑'], ['↓']] },
        { label: '開啟選取項目', keys: [['Enter']] },
        { label: '切換勾選', keys: [['Space']] },
        { label: '跳至第一/最後列', keys: [['Home'], ['End']] },
      ]
    }
  ]

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">{sc.title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{group.title}</p>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-foreground/80">{item.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((keyGroup, ki) => (
                        <span key={ki} className="flex items-center gap-1">
                          {ki > 0 && <span className="text-muted-foreground text-xs">/</span>}
                          <Kbd keys={keyGroup} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border bg-muted/30 space-y-2">
          <p className="text-center text-xs text-muted-foreground">按 <kbd className="inline-flex items-center rounded border border-border bg-background px-1 py-0.5 text-xs font-mono">Esc</kbd> 關閉</p>
          {/* A11y Rule 106: WCAG 2.1.4 — inform users that single-char shortcuts are auto-disabled in input fields */}
          <p className="text-xs text-muted-foreground/70 text-center leading-snug">
            在輸入框、文字欄位或選單中時，所有單鍵快捷鍵會自動停用，不影響文字輸入。
          </p>
        </div>
      </div>
    </div>
  )
}
