interface ShortcutOverlayProps {
  open: boolean
  onClose: () => void
}

interface ShortcutEntry {
  label: string
  keys: string[]
}

const shortcuts: ShortcutEntry[] = [
  { label: '全域搜尋', keys: ['⌘K', 'Ctrl+K'] },
  { label: '快捷鍵說明', keys: ['?'] },
  { label: '關閉對話框', keys: ['Esc'] },
  { label: '前往總覽', keys: ['G', 'H'] },
  { label: '前往商品管理', keys: ['G', 'P'] },
  { label: '前往採購管理', keys: ['G', 'B'] },
  { label: '前往銷售管理', keys: ['G', 'S'] },
  { label: '前往報表分析', keys: ['G', 'R'] },
  { label: '前往系統設定', keys: ['G', ','] }
]

export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
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
          <h2 className="text-base font-semibold">鍵盤快捷鍵</h2>
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
