import { useLang } from '@/lib/useLang'
import { modKey } from '@/lib/platform'

interface ShortcutOverlayProps {
  open: boolean
  onClose: () => void
}

interface ShortcutEntry {
  label: string
  keys: string[]
}

export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
  const t = useLang()
  const sc = t.shortcuts

  const shortcuts: ShortcutEntry[] = [
    { label: sc.globalSearch, keys: [`${modKey}K`] },
    { label: sc.showShortcuts, keys: ['?'] },
    { label: sc.closeDialog, keys: ['Esc'] },
    { label: sc.newItem, keys: ['N'] },
    { label: sc.goHome, keys: ['G', 'H'] },
    { label: sc.goProducts, keys: ['G', 'P'] },
    { label: sc.goPurchases, keys: ['G', 'B'] },
    { label: sc.goSales, keys: ['G', 'S'] },
    { label: sc.goReports, keys: ['G', 'R'] },
    { label: sc.goSettings, keys: ['G', ','] }
  ]

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{sc.title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xs border border-border rounded px-1.5 py-0.5"
          >
            Esc
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.label} className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-xs text-muted-foreground">or</span>}
                    <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                      {k}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
