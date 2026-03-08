import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  BarChart3,
  ClipboardList,
  Settings,
  Warehouse,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '總覽', end: true },
  { to: '/products', icon: Package, label: '商品管理' },
  { to: '/purchases', icon: ShoppingCart, label: '採購管理' },
  { to: '/sales', icon: TrendingUp, label: '銷售管理' },
  { to: '/suppliers', icon: Truck, label: '供應商' },
  { to: '/customers', icon: Users, label: '客戶管理' },
  { to: '/reports', icon: BarChart3, label: '報表分析' },
  { to: '/stock-take', icon: ClipboardList, label: '庫存盤點' }
]

export function Sidebar() {
  return (
    <aside className="flex flex-col w-56 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2 pl-[76px] pr-4 py-5 border-b border-sidebar-border titlebar-drag">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 text-primary">
          <Warehouse className="w-5 h-5" />
        </div>
        <div className="titlebar-no-drag">
          <div className="text-sm font-semibold text-sidebar-foreground">SkillCraft IMS</div>
          <div className="text-[10px] text-muted-foreground">進銷存管理系統</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors titlebar-no-drag',
                isActive
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Settings + About */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors titlebar-no-drag',
              isActive
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )
          }
        >
          <Settings className="w-4 h-4 shrink-0" />
          設定
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors titlebar-no-drag',
              isActive
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )
          }
        >
          <Info className="w-4 h-4 shrink-0" />
          關於
        </NavLink>
      </div>
    </aside>
  )
}
