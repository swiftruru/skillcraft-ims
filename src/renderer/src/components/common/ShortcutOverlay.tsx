import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLang } from '@/lib/useLang'
import { modKey } from '@/lib/platform'
import { useShortcutsStore } from '@/stores/shortcuts.store'
import { X, Settings2 } from 'lucide-react'
import { Button } from '../ui/button'

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
  twoCol?: boolean
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

const NAV_ENTRIES: { path: string; labelKey: string }[] = [
  { path: '/',                  labelKey: 'goHome' },
  { path: '/products',          labelKey: 'goProducts' },
  { path: '/purchases',         labelKey: 'goPurchases' },
  { path: '/sales',             labelKey: 'goSales' },
  { path: '/suppliers',         labelKey: 'goSuppliers' },
  { path: '/customers',         labelKey: 'goCustomers' },
  { path: '/receivables',       labelKey: 'goReceivables' },
  { path: '/reports',           labelKey: 'goReports' },
  { path: '/stock-take',        labelKey: 'goStockTake' },
  { path: '/inventory-history', labelKey: 'goInventoryHistory' },
  { path: '/settings',          labelKey: 'goSettings' },
]

const PAGE_SHORTCUTS: Record<string, { label: string; keys: string[][] }[]> = {
  '/products':          [{ label: '新增商品', keys: [['N']] }],
  '/purchases':         [{ label: '新增採購單', keys: [['N']] }],
  '/sales':             [{ label: '新增銷售單', keys: [['N']] }],
  '/suppliers':         [{ label: '新增供應商', keys: [['N']] }],
  '/customers':         [{ label: '新增客戶', keys: [['N']] }],
  '/stock-take':        [{ label: '新增盤點單', keys: [['N']] }],
}

export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
  const t = useLang()
  const sc = t.shortcuts
  const location = useLocation()
  const navigate = useNavigate()
  const { shortcuts } = useShortcutsStore()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const currentPath = location.pathname
  const pageItems = PAGE_SHORTCUTS[currentPath] ?? []

  const navItems: ShortcutEntry[] = NAV_ENTRIES.map(({ path, labelKey }) => {
    const bound = shortcuts.find((s) => s.path === path)?.key ?? ''
    const keyDisplay = bound ? ['G', bound.toUpperCase()] : ['G', '—']
    const isActive = path === currentPath
    return { label: `${sc[labelKey as keyof typeof sc] as string}${isActive ? ' ●' : ''}`, keys: [keyDisplay] }
  })

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
      title: sc.pageSpecific,
      items: pageItems
    },
    {
      title: '頁面導覽',
      items: navItems,
      twoCol: true
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
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

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{group.title}</p>
              {group.items.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 italic">{sc.noPageShortcuts}</p>
              ) : group.twoCol ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {group.items.map((item) => {
                    const isActive = item.label.endsWith(' ●')
                    const displayLabel = isActive ? item.label.slice(0, -2) : item.label
                    return (
                      <div
                        key={item.label}
                        className={`flex items-center justify-between gap-3 py-1 px-1.5 rounded ${isActive ? 'bg-primary/8 text-primary font-medium' : ''}`}
                      >
                        <span className={`text-xs ${isActive ? 'text-primary font-medium' : 'text-foreground/80'}`}>{displayLabel}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.keys.map((keyGroup, ki) => (
                            <span key={ki} className="flex items-center gap-1">
                              {ki > 0 && <span className="text-muted-foreground text-xs">/</span>}
                              <Kbd keys={keyGroup} />
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
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
              )}
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground/70 leading-snug">
            在輸入框、文字欄位或選單中時，所有單鍵快捷鍵會自動停用，不影響文字輸入。
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => { onClose(); navigate('/settings') }}
          >
            <Settings2 className="w-3 h-3" />
            {sc.customizeShortcuts}
          </Button>
        </div>
      </div>
    </div>
  )
}
