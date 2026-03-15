import { useCallback } from 'react'

/**
 * A11y Rule 77: Sends a message to the sr-only live region in Layout so
 * screen readers announce it. Call announce() after mutations to describe
 * the outcome (e.g. "已新增商品「鍵盤」").
 */
export function useAnnounce() {
  const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const id = politeness === 'assertive' ? 'sr-announcer-assertive' : 'sr-announcer-polite'
    const el = document.getElementById(id)
    if (!el) return
    // Reset then set to ensure re-read on identical messages
    el.textContent = ''
    requestAnimationFrame(() => {
      el.textContent = message
    })
  }, [])

  return { announce }
}
