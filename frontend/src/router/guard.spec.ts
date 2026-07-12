import { describe, it, expect, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'

let authed = false
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get isAuthenticated() {
      return authed
    },
  }),
}))

import { navigationGuard } from './guard'

function route(meta: Record<string, unknown>): RouteLocationNormalized {
  return { meta } as unknown as RouteLocationNormalized
}

describe('navigationGuard', () => {
  it('redirects an anonymous visitor away from a protected route', () => {
    authed = false
    expect(navigationGuard(route({ requiresAuth: true }))).toEqual({
      name: 'login',
    })
  })

  it('lets an authenticated user into a protected route', () => {
    authed = true
    expect(navigationGuard(route({ requiresAuth: true }))).toBe(true)
  })

  it('sends an authenticated user away from a guest-only route', () => {
    authed = true
    expect(navigationGuard(route({ guestOnly: true }))).toEqual({
      name: 'feed',
    })
  })

  it('lets an anonymous visitor reach a guest-only route', () => {
    authed = false
    expect(navigationGuard(route({ guestOnly: true }))).toBe(true)
  })

  it('lets anyone reach a route with no auth meta', () => {
    authed = false
    expect(navigationGuard(route({}))).toBe(true)
    authed = true
    expect(navigationGuard(route({}))).toBe(true)
  })
})
