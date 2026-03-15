import { cn } from '@/lib/utils'

interface HoverCardProps {
  trigger: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'right'
  className?: string
}

export function HoverCard({ trigger, children, side = 'bottom', className }: HoverCardProps) {
  const posClass =
    side === 'top'
      ? 'bottom-full mb-1 left-0'
      : side === 'right'
      ? 'left-full ml-1 top-0'
      : 'top-full mt-1 left-0'

  return (
    <div className="relative group inline-block">
      {trigger}
      <div
        className={cn(
          'absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100',
          'transition-all duration-150 delay-300 pointer-events-none',
          'bg-card border border-border rounded-xl shadow-xl p-3 min-w-[200px]',
          posClass,
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
