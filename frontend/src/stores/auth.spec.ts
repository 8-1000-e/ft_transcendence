import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }))

const ls: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string): string | null => ls[k] ?? null,
  setItem: (k: string, v: string) => {
    ls[k] = v
  },
  removeItem: (k: string) => {
    delete ls[k]
  },
  clear: () => {
    for (const k of Object.keys(ls)) delete ls[k]
  },
})

import { useAuthStore } from './auth'
import type { User } from '@/types/auth'

const user: User = {
  id: 'u1',
  email: 'a@b.co',
  name: 'Alice',
  createdAt: '2026-01-01',
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('setTokens keeps the access token in memory and persists the refresh token', () => {
    const s = useAuthStore()
    s.setTokens({ access_token: 'acc', refresh_token: 'ref' })
    expect(s.accessToken).toBe('acc')
    expect(s.refreshToken).toBe('ref')
    expect(localStorage.getItem('ft_refresh')).toBe('ref')
  })

  it('clear wipes state and removes the persisted refresh token', () => {
    const s = useAuthStore()
    s.setTokens({ access_token: 'acc', refresh_token: 'ref' })
    s.user = user
    s.clear()
    expect(s.accessToken).toBeNull()
    expect(s.refreshToken).toBeNull()
    expect(s.user).toBeNull()
    expect(localStorage.getItem('ft_refresh')).toBeNull()
  })

  it('isAuthenticated reflects the presence of a user', () => {
    const s = useAuthStore()
    expect(s.isAuthenticated).toBe(false)
    s.user = user
    expect(s.isAuthenticated).toBe(true)
  })

  it('reads an existing refresh token from localStorage on init', () => {
    localStorage.setItem('ft_refresh', 'persisted')
    const s = useAuthStore()
    expect(s.refreshToken).toBe('persisted')
    expect(s.isAuthenticated).toBe(false)
  })
})
