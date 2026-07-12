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

import { api } from '@/api/client'
import { useAuthStore } from './auth'
import type { User } from '@/types/auth'

const get = api.get as unknown as ReturnType<typeof vi.fn>
const post = api.post as unknown as ReturnType<typeof vi.fn>

const user: User = {
  id: 'u1',
  email: 'a@b.co',
  name: 'Alice',
  createdAt: '2026-01-01',
}
const tokens = { access_token: 'acc', refresh_token: 'ref' }

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('token state', () => {
    it('setTokens keeps the access token in memory and persists the refresh token', () => {
      const s = useAuthStore()
      s.setTokens(tokens)
      expect(s.accessToken).toBe('acc')
      expect(s.refreshToken).toBe('ref')
      expect(localStorage.getItem('ft_refresh')).toBe('ref')
    })

    it('clear wipes state and removes the persisted refresh token', () => {
      const s = useAuthStore()
      s.setTokens(tokens)
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

  describe('login', () => {
    it('stores the tokens then loads the current user', async () => {
      post.mockResolvedValueOnce(tokens)
      get.mockResolvedValueOnce(user)
      const s = useAuthStore()

      await s.login('a@b.co', 'password123')

      expect(post).toHaveBeenCalledWith(
        '/login',
        { email: 'a@b.co', password: 'password123' },
        { auth: false },
      )
      expect(s.accessToken).toBe('acc')
      expect(localStorage.getItem('ft_refresh')).toBe('ref')
      expect(s.user).toEqual(user)
    })

    it('propagates an error and leaves the user anonymous', async () => {
      post.mockRejectedValueOnce({ statusCode: 401, message: 'bad' })
      const s = useAuthStore()

      await expect(s.login('a@b.co', 'x')).rejects.toMatchObject({
        statusCode: 401,
      })
      expect(get).not.toHaveBeenCalled()
      expect(s.isAuthenticated).toBe(false)
    })
  })

  describe('signup', () => {
    it('posts the registration without auth and does not log in', async () => {
      post.mockResolvedValueOnce({ message: 'sent' })
      const s = useAuthStore()

      await s.signup('a@b.co', 'password123', 'Alice')

      expect(post).toHaveBeenCalledWith(
        '/signup',
        { email: 'a@b.co', password: 'password123', name: 'Alice' },
        { auth: false },
      )
      expect(s.isAuthenticated).toBe(false)
    })
  })

  describe('verify', () => {
    it('stores the tokens then loads the current user', async () => {
      post.mockResolvedValueOnce(tokens)
      get.mockResolvedValueOnce(user)
      const s = useAuthStore()

      await s.verify('a@b.co', '123456')

      expect(post).toHaveBeenCalledWith(
        '/verify',
        { email: 'a@b.co', code: '123456' },
        { auth: false },
      )
      expect(s.user).toEqual(user)
    })
  })

  describe('logout', () => {
    it('revokes the refresh token server-side then clears state', async () => {
      post.mockResolvedValueOnce(tokens).mockResolvedValueOnce(undefined)
      get.mockResolvedValueOnce(user)
      const s = useAuthStore()
      await s.login('a@b.co', 'password123')

      await s.logout()

      expect(post).toHaveBeenLastCalledWith('/logout', {
        refresh_token: 'ref',
      })
      expect(s.isAuthenticated).toBe(false)
      expect(localStorage.getItem('ft_refresh')).toBeNull()
    })

    it('still clears state when there is no refresh token to revoke', async () => {
      const s = useAuthStore()
      await s.logout()
      expect(post).not.toHaveBeenCalled()
      expect(s.accessToken).toBeNull()
    })

    it('clears state even if the revoke call fails', async () => {
      post.mockResolvedValueOnce(tokens).mockRejectedValueOnce(new Error('net'))
      get.mockResolvedValueOnce(user)
      const s = useAuthStore()
      await s.login('a@b.co', 'password123')

      await expect(s.logout()).rejects.toThrow('net')

      expect(s.isAuthenticated).toBe(false)
      expect(s.refreshToken).toBeNull()
      expect(localStorage.getItem('ft_refresh')).toBeNull()
    })
  })

  describe('cancelDeletion', () => {
    it('calls the cancel endpoint and lifts the pending flag', async () => {
      post.mockResolvedValueOnce(undefined)
      const s = useAuthStore()
      s.pendingDeletion = true

      await s.cancelDeletion()

      expect(post).toHaveBeenCalledWith('/me/cancel')
      expect(s.pendingDeletion).toBe(false)
    })
  })

  describe('tryRestoreSession', () => {
    it('returns false immediately when no refresh token is stored', async () => {
      const s = useAuthStore()
      await expect(s.tryRestoreSession()).resolves.toBe(false)
      expect(post).not.toHaveBeenCalled()
    })

    it('rotates the tokens and loads the user on success', async () => {
      localStorage.setItem('ft_refresh', 'ref')
      post.mockResolvedValueOnce(tokens)
      get.mockResolvedValueOnce(user)
      const s = useAuthStore()

      await expect(s.tryRestoreSession()).resolves.toBe(true)
      expect(s.accessToken).toBe('acc')
      expect(s.user).toEqual(user)
    })

    it('clears state and returns false when the refresh is rejected', async () => {
      localStorage.setItem('ft_refresh', 'ref')
      post.mockRejectedValueOnce({ statusCode: 401 })
      const s = useAuthStore()

      await expect(s.tryRestoreSession()).resolves.toBe(false)
      expect(s.refreshToken).toBeNull()
      expect(localStorage.getItem('ft_refresh')).toBeNull()
    })
  })

  describe('fetchMe', () => {
    it('populates the user from the API', async () => {
      get.mockResolvedValueOnce(user)
      const s = useAuthStore()
      await s.fetchMe()
      expect(get).toHaveBeenCalledWith('/me')
      expect(s.user).toEqual(user)
    })
  })
})
