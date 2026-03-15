import { create } from 'zustand'
import type { ToastVariant } from './toast'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  action?: { label: string; onClick: () => void }
  duration?: number
}

interface ToastStore {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => string
  removeToast: (id: string) => void
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    const duration = toast.duration ?? 3000
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, duration)
    return id
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}))

export function useToast() {
  const { addToast, removeToast } = useToastStore()
  return {
    toast: (opts: Omit<ToastItem, 'id'>) => {
      const id = addToast(opts)
      return { dismiss: () => removeToast(id) }
    }
  }
}

export { useToastStore }
