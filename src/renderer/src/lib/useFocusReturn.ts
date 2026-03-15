import { useRef, useCallback } from 'react'

/**
 * A11y Rule 82: Captures the currently focused element before opening a Dialog
 * and restores focus to it when the Dialog closes.
 *
 * Usage:
 *   const { capture, restore } = useFocusReturn()
 *   // Before opening dialog:
 *   capture(); setFormOpen(true)
 *   // After dialog closes (in onOpenChange handler):
 *   restore()
 */
export function useFocusReturn() {
  const lastFocused = useRef<HTMLElement | null>(null)

  const capture = useCallback(() => {
    lastFocused.current = document.activeElement as HTMLElement
  }, [])

  const restore = useCallback(() => {
    lastFocused.current?.focus()
  }, [])

  return { capture, restore }
}
