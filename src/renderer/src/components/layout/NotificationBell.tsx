import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, AlertTriangle, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import type { AppNotification } from '@/types/schema'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '剛才'
  if (minutes < 60) return `${minutes} 分鐘前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小時前`
  return `${Math.floor(hours / 24)} 天前`
}

function NotificationIcon({ type }: { type: string }) {
  if (type === 'low_stock') return <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
  if (type === 'backup') return <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
  return <Bell className="w-4 h-4 text-muted-foreground shrink-0" />
}

export function NotificationBell() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: notifications } = useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => window.electronAPI.notifications.getAll(),
    refetchInterval: 30000
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => window.electronAPI.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => window.electronAPI.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })

  const unreadCount = (notifications ?? []).filter((n) => n.read === 0).length
  const displayed = (notifications ?? []).slice(0, 10)

  // Close popover on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleNotificationClick = (n: AppNotification) => {
    markReadMutation.mutate(n.id)
    if (n.link) {
      navigate(n.link)
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((p) => !p)}
        aria-label="通知"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-0.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border border-border bg-card shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">通知</span>
            {unreadCount > 0 && (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => markAllReadMutation.mutate()}
              >
                全部標為已讀
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {displayed.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                無通知
              </div>
            ) : (
              displayed.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors ${n.read === 0 ? 'bg-primary/5' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <NotificationIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {n.read === 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
