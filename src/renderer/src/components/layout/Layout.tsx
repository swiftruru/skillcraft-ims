import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { StatusBar } from './StatusBar'
import { CommandPalette } from '../common/CommandPalette'
import { Toaster } from '../ui/toaster'
import { ShortcutOverlay } from '../common/ShortcutOverlay'
import { DemoController } from '../demo/DemoController'
import { useLang } from '@/lib/useLang'
import { purgeDemoData } from '@/lib/purgeDemoData'

export function Layout() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const t = useLang()
  const title = t.pageTitles[location.pathname as keyof typeof t.pageTitles] ?? 'SkillCraft IMS'
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutOpen, setShortcutOpen] = useState(false)

  // 每次 App 啟動時自動清理遺留 Demo 資料
  useEffect(() => {
    purgeDemoData().then(() => queryClient.invalidateQueries())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
        return
      }

      if (e.key === '?' && !isInput) {
        e.preventDefault()
        setShortcutOpen((prev) => !prev)
        return
      }

      if (e.key === 'Escape') {
        setShortcutOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header title={title} onSearchClick={() => setPaletteOpen(true)} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <StatusBar />
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutOverlay open={shortcutOpen} onClose={() => setShortcutOpen(false)} />
      <DemoController />
      <Toaster />
    </div>
  )
}
