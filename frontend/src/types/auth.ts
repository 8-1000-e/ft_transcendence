export interface Tokens {
  access_token: string
  refresh_token: string
}

export interface User {
  id: string
  email: string
  name: string
  ftId?: string | null
  ftPfpUrl?: string | null
  campus?: string | null
  campusId?: string | null
  createdAt: string
}

export interface ApiError {
  statusCode: number
  message: string
}
