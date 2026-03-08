import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { StatusBar } from './StatusBar'
import { CommandPalette } from '../common/CommandPalette'

const pageTitles: Record<string, string> = {
  '/': '總覽 Dashboard',
  '/products': '商品管理',
  '/purchases': '採購管理',
  '/sales': '銷售管理',
  '/suppliers': '供應商管理',
  '/customers': '客戶管理',
  '/reports': '報表分析',
  '/settings': '系統設定',
  '/about': '關於 SkillCraft IMS'
}

export function Layout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'SkillCraft IMS'
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
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
    </div>
  )
}
