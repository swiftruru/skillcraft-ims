import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { StatusBar } from './StatusBar'
import { CommandPalette } from '../common/CommandPalette'
import { Toaster } from '../ui/toaster'
import { ShortcutOverlay } from '../common/ShortcutOverlay'

const pageTitles: Record<string, string> = {
  '/': '總覽 Dashboard',
  '/products': '商品管理',
  '/purchases': '採購管理',
  '/sales': '銷售管理',
  '/suppliers': '供應商管理',
  '/customers': '客戶管理',
  '/reports': '報表分析',
  '/settings': '系統設定',
  '/about': '關於 SkillCraft IMS',
  '/stock-take': '庫存盤點',
  '/inventory-history': '庫存異動歷史'
}

export function Layout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'SkillCraft IMS'
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutOpen, setShortcutOpen] = useState(false)

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
      <Toaster />
    </div>
  )
}
