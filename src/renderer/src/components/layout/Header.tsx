import { useState } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle, Loader2, Search, Sun, Moon, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme.store'
import { useLangStore } from '@/stores/lang.store'
import { useLang } from '@/lib/useLang'
import { useDemoStore } from '@/stores/demo.store'
import { purgeDemoData } from '@/lib/purgeDemoData'
import { NotificationBell } from './NotificationBell'

type SyncState = 'idle' | 'running' | 'success' | 'error'

export function Header({ title, onSearchClick }: { title: string; onSearchClick?: () => void }) {
  const queryClient = useQueryClient()
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const { theme, toggleTheme } = useThemeStore()
  const { toggleLang } = useLangStore()
  const t = useLang()
  const [syncMessage, setSyncMessage] = useState('')
  const { startDemo } = useDemoStore()

  const handleStartDemo = async () => {
    await purgeDemoData()
    queryClient.invalidateQueries()
    startDemo()
  }

  const { data: kpis } = useQuery({
    queryKey: ['reports', 'kpis'],
    queryFn: () => window.electronAPI.reports.kpis(),
    refetchInterval: 60_000
  })

  const { data: syncStatus } = useQuery({
    queryKey: ['sync', 'status'],
    queryFn: () => window.electronAPI.sync.status(),
    refetchInterval: 30_000
  })

  const lastSync = syncStatus?.lastSync as { synced_at?: string; status?: string } | undefined

  const handleSync = async () => {
    setSyncState('running')
    setSyncMessage(t.header.syncing)

    window.electronAPI.sync.onProgress((data) => {
      setSyncMessage(data.message)
    })

    try {
      const result = await window.electronAPI.sync.trigger('bidirectional')
      if (result.success) {
        setSyncState('success')
        setSyncMessage(t.header.syncDone(result.recordsSynced ?? 0))
        queryClient.invalidateQueries()
      } else {
        setSyncState('error')
        setSyncMessage(result.error ?? t.header.syncFailed)
      }
    } catch {
      setSyncState('error')
      setSyncMessage(t.header.syncFailed)
    } finally {
      window.electronAPI.sync.removeListeners()
      setTimeout(() => setSyncState('idle'), 3000)
    }
  }

  const lowStockCount = kpis?.lowStockCount ?? 0

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50 backdrop-blur titlebar-drag">
      <h1 className="text-base font-semibold text-foreground titlebar-no-drag">{title}</h1>

      <div className="flex items-center gap-3 titlebar-no-drag">
        {/* Global search button */}
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors w-48"
        >
          <Search className="w-3 h-3" />
          <span>{t.header.search}</span>
          <kbd className="ml-auto text-[10px] bg-background border border-border rounded px-1 py-0.5">⌘K</kbd>
        </button>

        {/* Low stock alert */}
        {lowStockCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {t.header.lowStock(lowStockCount)}
          </div>
        )}

        {/* Sync status */}
        {syncState === 'running' && (
          <div className="flex items-center gap-1.5 text-xs text-blue-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            {syncMessage}
          </div>
        )}
        {syncState === 'success' && (
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            {syncMessage}
          </div>
        )}
        {syncState === 'error' && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <XCircle className="w-3 h-3" />
            {syncMessage}
          </div>
        )}
        {syncState === 'idle' && lastSync && (
          <span className="text-xs text-muted-foreground">
            {t.header.lastSync}{formatDate(lastSync.synced_at ?? '')}
          </span>
        )}

        {/* Live Demo button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleStartDemo}
          className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Play className="w-3 h-3" />
          Live Demo
        </Button>

        {/* Language toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLang}
          className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {t.header.switchLang}
        </Button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title={theme === 'dark' ? t.header.toLight : t.header.toDark}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* Sync button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncState === 'running'}
          className="h-8 text-xs gap-1.5"
        >
          <RefreshCw className={`w-3 h-3 ${syncState === 'running' ? 'animate-spin' : ''}`} />
          {t.header.syncSheets}
        </Button>
      </div>
    </header>
  )
}
