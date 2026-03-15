/**
 * Minimal Popover built on @radix-ui/react-dropdown-menu's portal primitives.
 * Since we don't have @radix-ui/react-popover installed, this is a lightweight
 * wrapper using a fixed-position portal via a simple React portal + outside-click.
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

interface PopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface PopoverTriggerProps {
  asChild?: boolean
  children: React.ReactElement
}

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const PopoverContext = React.createContext<{
  open: boolean
  onOpenChange: (v: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}>({ open: false, onOpenChange: () => {}, triggerRef: { current: null } })

export function Popover({ open, onOpenChange, children }: PopoverProps) {
  const triggerRef = React.useRef<HTMLElement | null>(null)
  return (
    <PopoverContext.Provider value={{ open, onOpenChange, triggerRef }}>
      <span className="relative inline-flex">{children}</span>
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger({ asChild, children }: PopoverTriggerProps) {
  const { triggerRef } = React.useContext(PopoverContext)
  if (asChild) {
    return React.cloneElement(children, {
      ref: (el: HTMLElement | null) => { triggerRef.current = el },
    } as React.HTMLAttributes<HTMLElement> & { ref: React.Ref<HTMLElement> })
  }
  return <span ref={(el) => { triggerRef.current = el }}>{children}</span>
}

export function PopoverContent({ children, className, ...props }: PopoverContentProps) {
  const { open, onOpenChange } = React.useContext(PopoverContext)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    // Delay so the triggering click doesn't immediately close
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute right-0 top-8 z-50 rounded-lg border border-border bg-card shadow-xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
