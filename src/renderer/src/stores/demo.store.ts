import { create } from 'zustand'

export interface DemoIds {
  supplierId?: number
  customerId?: number
  productId?: number
  purchaseId?: number
  salesId?: number
}

export interface DemoSpotlight {
  type: 'purchase' | 'sales'
  id: number
}

export type DemoStepStatus = 'idle' | 'running' | 'done' | 'error'

export interface DemoFormField {
  key: string
  label: { zh: string; en: string }
  typed: string
  targetValue: string
  done: boolean
  /** 'display' fields show instantly without animation (for action confirmations) */
  fieldType?: 'text' | 'number' | 'display'
}

export interface DemoFormState {
  title: { zh: string; en: string }
  subtitle: { zh: string; en: string }
  fields: DemoFormField[]
  /** All fields typed, waiting for user to click submit */
  waitingForSubmit: boolean
  /** API call in progress after submit clicked */
  isSubmitting: boolean
}

interface DemoStore {
  isActive: boolean
  currentStep: number
  stepStatus: DemoStepStatus
  stepError: string
  demoIds: DemoIds
  collapsed: boolean
  formOverlay: DemoFormState | null
  /** Resolved when user clicks the submit button in DemoFormOverlay */
  submitCallback: (() => void) | null
  /** Spotlight a specific action button in the UI so students can see where to click */
  spotlight: DemoSpotlight | null

  startDemo: () => void
  setStepStatus: (s: DemoStepStatus, err?: string) => void
  advanceStep: () => void
  setDemoIds: (ids: Partial<DemoIds>) => void
  toggleCollapsed: () => void
  endDemo: () => void
  setSpotlight: (s: DemoSpotlight | null) => void

  // Form overlay
  openFormOverlay: (state: Omit<DemoFormState, 'isSubmitting' | 'waitingForSubmit'>) => void
  setTypingField: (key: string, typed: string) => void
  markFieldDone: (key: string) => void
  setFormWaiting: (v: boolean) => void
  setSubmitCallback: (cb: (() => void) | null) => void
  setFormSubmitting: (v: boolean) => void
  closeFormOverlay: () => void
}

export const useDemoStore = create<DemoStore>((set) => ({
  isActive: false,
  currentStep: 0,
  stepStatus: 'idle',
  stepError: '',
  demoIds: {},
  collapsed: false,
  formOverlay: null,
  submitCallback: null,
  spotlight: null,

  startDemo: () => set({
    isActive: true, currentStep: 0, stepStatus: 'idle',
    demoIds: {}, collapsed: false, formOverlay: null, submitCallback: null, spotlight: null,
  }),
  setStepStatus: (stepStatus, stepError = '') => set({ stepStatus, stepError }),
  advanceStep: () => set((s) => ({ currentStep: s.currentStep + 1, stepStatus: 'idle', stepError: '' })),
  setDemoIds: (ids) => set((s) => ({ demoIds: { ...s.demoIds, ...ids } })),
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
  endDemo: () => set({
    isActive: false, currentStep: 0, stepStatus: 'idle',
    stepError: '', demoIds: {}, collapsed: false, formOverlay: null, submitCallback: null, spotlight: null,
  }),
  setSpotlight: (spotlight) => set({ spotlight }),

  openFormOverlay: (state) => set({
    formOverlay: { ...state, waitingForSubmit: false, isSubmitting: false },
  }),
  setTypingField: (key, typed) => set((s) => ({
    formOverlay: s.formOverlay ? {
      ...s.formOverlay,
      fields: s.formOverlay.fields.map(f => f.key === key ? { ...f, typed, done: false } : f),
    } : null,
  })),
  markFieldDone: (key) => set((s) => ({
    formOverlay: s.formOverlay ? {
      ...s.formOverlay,
      fields: s.formOverlay.fields.map(f =>
        f.key === key ? { ...f, typed: f.targetValue, done: true } : f
      ),
    } : null,
  })),
  setFormWaiting: (waitingForSubmit) => set((s) => ({
    formOverlay: s.formOverlay ? { ...s.formOverlay, waitingForSubmit } : null,
  })),
  setSubmitCallback: (submitCallback) => set({ submitCallback }),
  setFormSubmitting: (isSubmitting) => set((s) => ({
    formOverlay: s.formOverlay ? { ...s.formOverlay, isSubmitting, waitingForSubmit: false } : null,
  })),
  closeFormOverlay: () => set({ formOverlay: null, submitCallback: null }),
}))
