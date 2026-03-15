import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { DashboardKPIs } from '@/types/schema'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { StatusBar } from './StatusBar'
import { NavProgressBar } from './NavProgressBar'
import { CommandPalette } from '../common/CommandPalette'
import { Toaster } from '../ui/toaster'
import { ShortcutOverlay } from '../common/ShortcutOverlay'
import { DemoController } from '../demo/DemoController'
import { UxTourOverlay } from '../demo/UxTourOverlay'
import { useLang } from '@/lib/useLang'
import { purgeDemoData } from '@/lib/purgeDemoData'
import { useShortcutsStore } from '@/stores/shortcuts.store'

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const t = useLang()
  const title = t.pageTitles[location.pathname as keyof typeof t.pageTitles] ?? 'SkillCraft IMS'
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutOpen, setShortcutOpen] = useState(false)
  const gMode = useRef(false)
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const getNavPath = useShortcutsStore((s) => s.getPath)

  const { data: kpis } = useQuery<DashboardKPIs>({
    queryKey: ['reports', 'kpis'],
    queryFn: () => window.electronAPI.reports.kpis(),
    staleTime: 1000 * 60 * 2
  })

  // 動態更新視窗標題：有緊急事項時加上計數前綴
  useEffect(() => {
    const urgent = (kpis?.lowStockCount ?? 0) + (kpis?.overdueCount ?? 0)
    document.title = urgent > 0 ? `(${urgent}) SkillCraft IMS` : 'SkillCraft IMS'
  }, [kpis?.lowStockCount, kpis?.overdueCount])

  // 每次 App 啟動時自動清理遺留 Demo 資料
  useEffect(() => {
    purgeDemoData().then(() => queryClient.invalidateQueries())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // A11y Rule 89: Focus main content on route change for screen reader navigation
  useEffect(() => {
    const main = document.getElementById('main-content') as HTMLElement | null
    if (main) {
      main.focus({ preventScroll: true })
    }
  }, [location.pathname])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
        return
      }

      if (e.key === 'Escape') {
        setShortcutOpen(false)
        gMode.current = false
        if (gTimer.current) clearTimeout(gTimer.current)
        return
      }

      if (isInput) return

      if (e.key === '?') {
        e.preventDefault()
        setShortcutOpen((prev) => !prev)
        return
      }

      // G+key two-key navigation (reads from customizable shortcuts store)
      if (gMode.current) {
        const route = getNavPath(e.key.toLowerCase())
        gMode.current = false
        if (gTimer.current) clearTimeout(gTimer.current)
        if (route) { e.preventDefault(); navigate(route) }
        return
      }

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        gMode.current = true
        if (gTimer.current) clearTimeout(gTimer.current)
        gTimer.current = setTimeout(() => { gMode.current = false }, 1500)
        return
      }

      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('ims:new-item'))
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (gTimer.current) clearTimeout(gTimer.current)
    }
  }, [navigate, getNavPath])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* A11y Rule 79: Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-card focus:border focus:border-border focus:rounded-md focus:px-3 focus:py-1.5 focus:text-sm focus:shadow-lg"
      >
        跳至主要內容
      </a>
      <NavProgressBar />
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header title={title} onSearchClick={() => setPaletteOpen(true)} />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto outline-none">
          <Outlet />
        </main>
        <StatusBar />
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutOverlay open={shortcutOpen} onClose={() => setShortcutOpen(false)} />
      <DemoController />
      <UxTourOverlay />
      <Toaster />
      {/* A11y Rule 77: Screen reader live regions */}
      <div id="sr-announcer-polite" aria-live="polite" aria-atomic="true" className="sr-only" />
      <div id="sr-announcer-assertive" aria-live="assertive" aria-atomic="true" className="sr-only" />
      <button
        className="fixed bottom-5 right-5 z-40 w-8 h-8 rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center text-sm font-mono shadow-sm"
        title="鍵盤快捷鍵 (?)"
        aria-label="鍵盤快捷鍵說明"
        onClick={() => setShortcutOpen((v) => !v)}
      >
        ?
      </button>
    </div>
  )
}
