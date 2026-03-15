import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Purchases from './pages/Purchases'
import Sales from './pages/Sales'
import Suppliers from './pages/Suppliers'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import About from './pages/About'
import StockTake from './pages/StockTake'
import InventoryHistory from './pages/InventoryHistory'
import Receivables from './pages/Receivables'
import AiInsight from './pages/AiInsight'
import { useThemeStore } from './stores/theme.store'
import { useLangStore } from './stores/lang.store'

export default function App() {
  const applyTheme = useThemeStore((s) => s.applyTheme)
  const initFromSystem = useThemeStore((s) => s.initFromSystem)
  const lang = useLangStore((s) => s.lang)

  useEffect(() => {
    initFromSystem().then(() => applyTheme())
  }, [applyTheme, initFromSystem])

  // A11y Rule 93: keep <html lang> in sync with UI language
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en'
  }, [lang])


  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/stock-take" element={<StockTake />} />
          <Route path="/inventory-history" element={<InventoryHistory />} />
          <Route path="/receivables" element={<Receivables />} />
          <Route path="/ai" element={<AiInsight />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
