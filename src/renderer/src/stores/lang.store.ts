import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'zh' | 'en'

interface LangStore {
  lang: Lang
  toggleLang: () => void
}

export const useLangStore = create<LangStore>()(
  persist(
    (set, get) => ({
      lang: 'zh',
      toggleLang: () => {
        set({ lang: get().lang === 'zh' ? 'en' : 'zh' })
      }
    }),
    { name: 'ims-lang' }
  )
)
