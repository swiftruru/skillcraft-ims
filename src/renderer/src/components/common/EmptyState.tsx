import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void; loading?: boolean }
}

export function EmptyState({ icon: Icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Icon className="w-16 h-16 text-muted-foreground/20" strokeWidth={1} />
      <p className="text-base font-medium">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">{description}</p>
      )}
      {action && (
        <Button size="sm" className="mt-1" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50"
          onClick={secondaryAction.onClick}
          disabled={secondaryAction.loading}
        >
          {secondaryAction.loading && <Loader2 className="w-3 h-3 animate-spin" />}
          {secondaryAction.label}
        </button>
      )}
    </div>
  )
}
