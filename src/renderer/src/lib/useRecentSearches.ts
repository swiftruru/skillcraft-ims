import { useState, useCallback } from 'react'

const MAX_RECENT = 8

export function useRecentSearches(storageKey: string) {
  const load = (): string[] => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  }

  const [recentSearches, setRecentSearches] = useState<string[]>(load)

  const addSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      if (!trimmed) return
      setRecentSearches((prev) => {
        const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, MAX_RECENT)
        localStorage.setItem(storageKey, JSON.stringify(next))
        return next
      })
    },
    [storageKey]
  )

  const removeOne = useCallback(
    (q: string) => {
      setRecentSearches((prev) => {
        const next = prev.filter((s) => s !== q)
        localStorage.setItem(storageKey, JSON.stringify(next))
        return next
      })
    },
    [storageKey]
  )

  const clearAll = useCallback(() => {
    localStorage.removeItem(storageKey)
    setRecentSearches([])
  }, [storageKey])

  return { recentSearches, addSearch, removeOne, clearAll }
}
