import type { SearchResult } from '@/types/schema'

const KEY = 'ims-recent-items'
const MAX = 5

export function getRecentItems(): SearchResult[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SearchResult[]) : []
  } catch {
    return []
  }
}

export function addRecentItem(item: SearchResult): void {
  const prev = getRecentItems().filter((r) => !(r.type === item.type && r.id === item.id))
  const next = [item, ...prev].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(next))
}
