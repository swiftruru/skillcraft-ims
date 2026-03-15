import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  applyTheme: () => void
  initFromSystem: () => Promise<void>
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.classList.toggle('dark', next === 'dark')
        // A11y Rule 80: keep Electron nativeTheme in sync
        window.electronAPI.app.setNativeTheme(next)
      },
      applyTheme: () => {
        document.documentElement.classList.toggle('dark', get().theme === 'dark')
        window.electronAPI.app.setNativeTheme(get().theme)
      },
      // Called once on app init if no stored preference has been set
      initFromSystem: async () => {
        const stored = localStorage.getItem('ims-theme')
        if (stored) return // user already has a preference
        const systemTheme = await window.electronAPI.app.getNativeTheme()
        set({ theme: systemTheme })
        document.documentElement.classList.toggle('dark', systemTheme === 'dark')
      }
    }),
    { name: 'ims-theme' }
  )
)
