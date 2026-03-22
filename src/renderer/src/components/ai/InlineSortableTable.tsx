import { useState, useCallback } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InlineSortableTableProps {
  headers: string[]
  rows: string[][]
}

export function InlineSortableTable({ headers, rows }: InlineSortableTableProps) {
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [copied, setCopied] = useState(false)

  // Detect numeric columns (all non-empty values parse as number)
  const isNumericCol = headers.map((_, ci) =>
    rows.length > 0 &&
    rows.every((r) => r[ci] === undefined || r[ci] === '' || !isNaN(Number(r[ci].replace(/,/g, ''))))
  )

  const handleSort = (ci: number) => {
    if (sortCol === ci) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(ci)
      setSortDir('asc')
    }
  }

  const sortedRows =
    sortCol === null
      ? rows
      : [...rows].sort((a, b) => {
          const av = a[sortCol] ?? ''
          const bv = b[sortCol] ?? ''
          const numA = Number(av.replace(/,/g, ''))
          const numB = Number(bv.replace(/,/g, ''))
          const cmp =
            isNumericCol[sortCol] && !isNaN(numA) && !isNaN(numB)
              ? numA - numB
              : av.localeCompare(bv, 'zh-TW')
          return sortDir === 'asc' ? cmp : -cmp
        })

  const handleCopy = useCallback(() => {
    const tsv = [headers, ...sortedRows].map((r) => r.join('\t')).join('\n')
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [headers, sortedRows])

  if (headers.length === 0) return null

  return (
    <div className="relative mb-2 overflow-x-auto rounded border border-border">
      <button
        onClick={handleCopy}
        className="absolute top-1 right-1 z-10 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        title="複製為 TSV"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr>
            {headers.map((h, ci) => (
              <th
                key={ci}
                onClick={() => handleSort(ci)}
                className={cn(
                  'px-2 py-1.5 bg-muted/40 font-medium text-left border-b border-border cursor-pointer select-none',
                  'hover:bg-muted/70 transition-colors',
                  isNumericCol[ci] && 'text-right',
                  ci === headers.length - 1 && 'pr-7'
                )}
              >
                <span className="flex items-center gap-1 justify-between">
                  <span>{h}</span>
                  {sortCol === ci ? (
                    sortDir === 'asc' ? (
                      <ArrowUp className="w-2.5 h-2.5 shrink-0" />
                    ) : (
                      <ArrowDown className="w-2.5 h-2.5 shrink-0" />
                    )
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 shrink-0 opacity-30" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, ri) => (
            <tr key={ri} className="border-b border-border last:border-0 hover:bg-muted/20">
              {headers.map((_, ci) => (
                <td
                  key={ci}
                  className={cn(
                    'px-2 py-1 border-r border-border last:border-0',
                    isNumericCol[ci] && 'text-right tabular-nums'
                  )}
                >
                  {row[ci] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
