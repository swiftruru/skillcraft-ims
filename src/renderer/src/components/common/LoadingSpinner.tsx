import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="載入中" className={cn('flex items-center justify-center h-32', className)}>
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">載入中，請稍候</span>
    </div>
  )
}
