import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useAnnounce } from '@/lib/useAnnounce'
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
  Info,
  Wallet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/useLang'
import type { DashboardKPIs } from '@/types/schema'
import { useShortcutsStore } from '@/stores/shortcuts.store'

export function Sidebar() {
  const t = useLang()
  const location = useLocation()
  const getKey = useShortcutsStore((s) => s.getKey)
  const { announce } = useAnnounce()

  const { data: kpis } = useQuery<DashboardKPIs>({
    queryKey: ['reports', 'kpis'],
    queryFn: () => window.electronAPI.reports.kpis(),
    staleTime: 1000 * 60 * 2
  })

  // Announce badge increases to screen readers
  const prevLow = useRef<number>(0)
  const prevPurchases = useRef<number>(0)
  const prevSales = useRef<number>(0)
  useEffect(() => {
    if (!kpis) return
    const low = kpis.lowStockCount ?? 0
    const pur = kpis.pendingPurchasesCount ?? 0
    const sal = kpis.pendingSalesOrders ?? 0
    if (low > prevLow.current) announce(`低庫存商品：${low} 項`)
    if (pur > prevPurchases.current) announce(`待處理採購：${pur} 筆`)
    if (sal > prevSales.current) announce(`待處理銷售：${sal} 筆`)
    prevLow.current = low
    prevPurchases.current = pur
    prevSales.current = sal
  }, [kpis?.lowStockCount, kpis?.pendingPurchasesCount, kpis?.pendingSalesOrders])

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t.nav.dashboard, end: true },
    { to: '/products', icon: Package, label: t.nav.products, badge: kpis?.lowStockCount, badgeStyle: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
    { to: '/purchases', icon: ShoppingCart, label: t.nav.purchases, badge: kpis?.pendingPurchasesCount, badgeStyle: 'bg-primary/15 text-primary' },
    { to: '/sales', icon: TrendingUp, label: t.nav.sales, badge: kpis?.pendingSalesOrders, badgeStyle: 'bg-primary/15 text-primary' },
    { to: '/suppliers', icon: Truck, label: t.nav.suppliers },
    { to: '/customers', icon: Users, label: t.nav.customers },
    { to: '/receivables', icon: Wallet, label: t.nav.receivables, badge: kpis?.overdueCount, badgeStyle: 'bg-red-500/20 text-red-500' },
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
          <div className="text-sm font-semibold text-sidebar-foreground leading-tight"><span lang="en">SkillCraft IMS</span></div>
          <div className="text-[10px] text-muted-foreground leading-tight">{t.sidebar.subtitle}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="主要導覽">
        {navItems.map((item) => {
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)
          return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            aria-current={isActive ? 'page' : undefined}
            className={({ isActive: a }) =>
              cn(
                'group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors titlebar-no-drag',
                a
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className={cn('text-xs font-semibold rounded-full px-1.5 py-0.5 leading-none tabular-nums', item.badgeStyle)}>
                {item.badge}
              </span>
            )}
            {getKey(item.to) && (
              <kbd className="hidden group-hover:inline-flex items-center text-[9px] font-mono leading-none border border-border/60 rounded px-1 py-0.5 text-muted-foreground/60 bg-muted/40 shrink-0">
                G+{getKey(item.to)?.toUpperCase()}
              </kbd>
            )}
          </NavLink>
        )})}
      </nav>

      {/* Settings + About */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        <NavLink
          to="/settings"
          aria-current={location.pathname.startsWith('/settings') ? 'page' : undefined}
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
          aria-current={location.pathname.startsWith('/about') ? 'page' : undefined}
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
