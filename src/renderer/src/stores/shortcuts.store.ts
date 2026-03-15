import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface NavShortcut {
  path: string
  key: string // single char, e.g. 'h', 'p', ','
}

/** Default G+key bindings for each route */
export const DEFAULT_SHORTCUTS: NavShortcut[] = [
  { path: '/',                   key: 'h' },
  { path: '/products',           key: 'p' },
  { path: '/purchases',          key: 'b' },
  { path: '/sales',              key: 's' },
  { path: '/suppliers',          key: 'u' },
  { path: '/customers',          key: 'c' },
  { path: '/receivables',        key: 'a' },
  { path: '/reports',            key: 'r' },
  { path: '/stock-take',         key: 't' },
  { path: '/inventory-history',  key: 'i' },
  { path: '/settings',           key: ',' },
]

interface ShortcutsStore {
  shortcuts: NavShortcut[]
  setKey: (path: string, key: string) => void
  resetAll: () => void
  /** Returns the key for a given path, or undefined */
  getKey: (path: string) => string | undefined
  /** Returns the path for a given key (for keydown lookup) */
  getPath: (key: string) => string | undefined
}

export const useShortcutsStore = create<ShortcutsStore>()(
  persist(
    (set, get) => ({
      shortcuts: DEFAULT_SHORTCUTS,
      setKey: (path, key) => {
        const trimmed = key.trim().toLowerCase().slice(0, 1)
        if (!trimmed) return
        set((state) => ({
          shortcuts: state.shortcuts.map((s) =>
            s.path === path
              ? { ...s, key: trimmed }
              : // clear duplicate key from other routes
                s.key === trimmed ? { ...s, key: '' } : s
          )
        }))
      },
      resetAll: () => set({ shortcuts: DEFAULT_SHORTCUTS }),
      getKey: (path) => get().shortcuts.find((s) => s.path === path)?.key,
      getPath: (key) => {
        const k = key.toLowerCase()
        return get().shortcuts.find((s) => s.key === k)?.path
      },
    }),
    { name: 'ims-nav-shortcuts' }
  )
)
