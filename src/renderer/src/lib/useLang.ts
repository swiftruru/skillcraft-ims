import { useLangStore } from '@/stores/lang.store'
import { translations } from '@/i18n/translations'

export function useLang() {
  const { lang } = useLangStore()
  return translations[lang]
}
