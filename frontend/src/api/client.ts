import { API_BASE_URL, ROUTES } from './routes'
import type { ApiError, Tokens } from '@/types/auth'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
  _retry?: boolean
}

let refreshPromise: Promise<boolean> | null = null

async function getAuthStore() {
  const { useAuthStore } = await import('@/stores/auth')
  return useAuthStore()
}

function buildError(statusCode: number, payload: unknown): ApiError {
  let message = 'Une erreur est survenue'
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const m = (payload as { message: unknown }).message
    message = Array.isArray(m) ? m.join(', ') : String(m)
  }
  return { statusCode, message }
}

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const store = await getAuthStore()
    const refresh_token = store.refreshToken
    if (!refresh_token) return false

    const res = await fetch(`${API_BASE_URL}${ROUTES.auth.refresh}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    })
    if (!res.ok) return false

    const tokens = (await res.json()) as Tokens
    store.setTokens(tokens)
    return true
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true, _retry = false } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const store = await getAuthStore()
    if (store.accessToken) headers['Authorization'] = `Bearer ${store.accessToken}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && auth && !_retry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return request<T>(path, { ...options, _retry: true })
    }
    const store = await getAuthStore()
    store.clear()
    const { default: router } = await import('@/router')
    await router.push('/login')
    throw buildError(401, { message: 'Session expirée' })
  }

  if (!res.ok) {
    let payload: unknown = null
    try {
      payload = await res.json()
    } catch {
      payload = null
    }
    throw buildError(res.status, payload)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  del: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
}
