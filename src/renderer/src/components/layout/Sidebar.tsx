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
  History,
  Settings,
  Warehouse,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/useLang'

export function Sidebar() {
  const t = useLang()

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t.nav.dashboard, end: true },
    { to: '/products', icon: Package, label: t.nav.products },
    { to: '/purchases', icon: ShoppingCart, label: t.nav.purchases },
    { to: '/sales', icon: TrendingUp, label: t.nav.sales },
    { to: '/suppliers', icon: Truck, label: t.nav.suppliers },
    { to: '/customers', icon: Users, label: t.nav.customers },
    { to: '/reports', icon: BarChart3, label: t.nav.reports },
    { to: '/stock-take', icon: ClipboardList, label: t.nav.stockTake },
    { to: '/inventory-history', icon: History, label: t.nav.inventoryHistory }
  ]

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* macOS traffic-light drag zone */}
      <div className="h-8 titlebar-drag shrink-0" />

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 pb-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 text-primary shrink-0">
          <Warehouse className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-sidebar-foreground leading-tight">SkillCraft IMS</div>
          <div className="text-[10px] text-muted-foreground leading-tight">{t.sidebar.subtitle}</div>
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
          {t.nav.settings}
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
          {t.nav.about}
        </NavLink>
      </div>
    </aside>
  )
}
