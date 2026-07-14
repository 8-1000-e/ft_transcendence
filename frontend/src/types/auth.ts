export interface Tokens {
  access_token: string
  refresh_token: string
}

export interface User {
  id: string
  email: string
  name: string
  campus: string | null
  ftPfpUrl: string | null
  has42: boolean
  createdAt: string
  karma: number
}

export interface ApiError {
  statusCode: number
  message: string
}
