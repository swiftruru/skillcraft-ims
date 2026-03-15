/**
 * Rule 73: Category Color Map
 * Maps category names to one of 6 preset colors using character code sum mod 6.
 */

const COLOR_CLASSES = [
  { bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', hex: '#3b82f6' },
  { bg: 'bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500', hex: '#8b5cf6' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500', hex: '#06b6d4' },
  { bg: 'bg-green-500/15', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500', hex: '#10b981' },
  { bg: 'bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500', hex: '#f59e0b' },
  { bg: 'bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500', hex: '#ef4444' },
]

function hashCategory(name: string): number {
  if (!name) return 0
  let sum = 0
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i)
  }
  return sum % COLOR_CLASSES.length
}

export function categoryColor(name: string) {
  return COLOR_CLASSES[hashCategory(name)]
}

/** Returns the hex color for use in Recharts fills */
export function categoryHex(name: string): string {
  return COLOR_CLASSES[hashCategory(name)].hex
}
