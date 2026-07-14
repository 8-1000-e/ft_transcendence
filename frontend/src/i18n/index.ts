import { ref } from 'vue'
import { messages, type Locale } from './messages'

export type { Locale }

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
]

const STORAGE = 'ft_lang'

function initial(): Locale {
  const s = localStorage.getItem(STORAGE)
  return s === 'fr' || s === 'es' ? s : 'en'
}

export const locale = ref<Locale>(initial())

export function setLocale(l: Locale): void {
  locale.value = l
  localStorage.setItem(STORAGE, l)
  document.documentElement.lang = l
}

// Reactive: reads locale.value so templates re-render on language change; falls back to en, then the key.
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = messages[locale.value]
  let str = dict[key] ?? messages.en[key] ?? key
  if (params) {
    for (const k in params) str = str.split(`{${k}}`).join(String(params[k]))
  }
  return str
}

export function useI18n() {
  return { t, locale, setLocale, LOCALES }
}

// Make $t available in every template without a per-component import.
declare module 'vue' {
  interface ComponentCustomProperties {
    $t: typeof t
  }
}
