import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
  value: string
  className?: string
}

export function CopyButton({ value, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center w-4 h-4 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-pointer shrink-0',
        className
      )}
      title="複製"
    >
      {copied
        ? <Check className="w-3 h-3 text-green-500" />
        : <Copy className="w-3 h-3" />
      }
    </button>
  )
}
