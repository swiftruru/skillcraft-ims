import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { StatusBar } from './StatusBar'

const pageTitles: Record<string, string> = {
  '/': '總覽 Dashboard',
  '/products': '商品管理',
  '/purchases': '採購管理',
  '/sales': '銷售管理',
  '/suppliers': '供應商管理',
  '/customers': '客戶管理',
  '/reports': '報表分析',
  '/settings': '系統設定'
}

export function Layout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'SkillCraft IMS'

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header title={title} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <StatusBar />
      </div>
    </div>
  )
}
