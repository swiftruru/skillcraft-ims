import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-TW').format(value)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
  } catch {
    return dateStr
  }
}

export function calcChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待處理',
    received: '已收貨',
    completed: '已完成',
    cancelled: '已取消',
    returned: '已退貨',
    partial_return: '部分退貨'
  }
  return labels[status] ?? status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10',
    received: 'text-green-400 bg-green-400/10',
    completed: 'text-green-400 bg-green-400/10',
    cancelled: 'text-red-400 bg-red-400/10',
    returned: 'text-orange-400 bg-orange-400/10',
    partial_return: 'text-amber-400 bg-amber-400/10'
  }
  return colors[status] ?? 'text-muted-foreground bg-muted'
}
