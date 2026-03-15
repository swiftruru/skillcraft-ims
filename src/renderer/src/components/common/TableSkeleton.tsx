import { Skeleton } from '@/components/ui/skeleton'

const COL_WIDTHS = ['w-40', 'w-32', 'w-24', 'w-28', 'w-20', 'w-24', 'w-16']

interface TableSkeletonProps {
  rows?: number
  cols?: number
}

export function TableSkeleton({ rows = 8, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, ri) => (
            <tr key={ri} className="border-b border-border/50">
              {Array.from({ length: cols }).map((_, ci) => (
                <td key={ci} className="px-4 py-3">
                  <Skeleton className={`h-4 ${COL_WIDTHS[ci % COL_WIDTHS.length]}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
