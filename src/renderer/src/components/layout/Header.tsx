import { useState } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '@/lib/utils'

type SyncState = 'idle' | 'running' | 'success' | 'error'

export function Header({ title, onSearchClick }: { title: string; onSearchClick?: () => void }) {
  const queryClient = useQueryClient()
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [syncMessage, setSyncMessage] = useState('')

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
    setSyncMessage('同步中...')

    window.electronAPI.sync.onProgress((data) => {
      setSyncMessage(data.message)
    })

    try {
      const result = await window.electronAPI.sync.trigger('bidirectional')
      if (result.success) {
        setSyncState('success')
        setSyncMessage(`同步完成，共 ${result.recordsSynced} 筆`)
        queryClient.invalidateQueries()
      } else {
        setSyncState('error')
        setSyncMessage(result.error ?? '同步失敗')
      }
    } catch {
      setSyncState('error')
      setSyncMessage('同步失敗')
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
          <span>搜尋...</span>
          <kbd className="ml-auto text-[10px] bg-background border border-border rounded px-1 py-0.5">⌘K</kbd>
        </button>

        {/* Low stock alert */}
        {lowStockCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {lowStockCount} 項低庫存
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
            上次同步：{formatDate(lastSync.synced_at ?? '')}
          </span>
        )}

        {/* Sync button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncState === 'running'}
          className="h-8 text-xs gap-1.5"
        >
          <RefreshCw className={`w-3 h-3 ${syncState === 'running' ? 'animate-spin' : ''}`} />
          同步 Sheets
        </Button>
      </div>
    </header>
  )
}
