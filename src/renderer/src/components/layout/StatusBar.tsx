import { useQuery } from '@tanstack/react-query'
import { Database } from 'lucide-react'

export function StatusBar() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.electronAPI.settings.get(),
    staleTime: Infinity
  })

  return (
    <div className="flex items-center gap-4 px-4 py-1 border-t border-border bg-card/30 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Database className="w-3 h-3" />
        <span className="truncate max-w-xs">{settings?.dbPath ?? '載入中...'}</span>
      </div>
      <div className="ml-auto">SkillCraft IMS v0.1.0</div>
    </div>
  )
}
