import type { Locale } from '@/i18n'

export interface Tokens {
  access_token: string
  refresh_token: string
}

export interface User {
  id: string
  email: string
  name: string
  login: string | null
  campus: string | null
  ftPfpUrl: string | null
  has42: boolean
  hasPassword: boolean
  pendingDeletion: boolean
  createdAt: string
  karma: number
  locale: Locale
}

export interface ApiError {
  statusCode: number
  message: string
}
