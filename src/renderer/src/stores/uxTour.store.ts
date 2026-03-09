import { create } from 'zustand'
import { UX_TOUR_STEPS } from '@/lib/uxTourSteps'

const TOTAL = UX_TOUR_STEPS.length

interface UxTourStore {
  isOpen: boolean
  currentStep: number
  open: () => void
  close: () => void
  next: () => void
  prev: () => void
}

export const useUxTourStore = create<UxTourStore>((set, get) => ({
  isOpen: false,
  currentStep: 0,
  open: () => set({ isOpen: true, currentStep: 0 }),
  close: () => set({ isOpen: false }),
  next: () => {
    const { currentStep } = get()
    if (currentStep < TOTAL - 1) set({ currentStep: currentStep + 1 })
  },
  prev: () => {
    const { currentStep } = get()
    if (currentStep > 0) set({ currentStep: currentStep - 1 })
  },
}))
