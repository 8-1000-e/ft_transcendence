import { describe, it, expect, beforeEach, vi } from 'vitest'

const authMock = {
  accessToken: null as string | null,
  refreshToken: null as string | null,
  pendingDeletion: false,
  setTokens: vi.fn(),
  clear: vi.fn(),
}

const routerMock = { push: vi.fn() }

vi.mock('@/stores/auth', () => ({ useAuthStore: () => authMock }))
vi.mock('@/router', () => ({ default: routerMock }))

import { api, request } from './client'

interface FakeResponse {
  ok: boolean
  status: number
  json?: () => Promise<unknown>
  text?: () => Promise<string>
}

function res(r: Partial<FakeResponse>): FakeResponse {
  return {
    ok: r.ok ?? true,
    status: r.status ?? 200,
    json: r.json ?? (() => Promise.resolve({})),
    text: r.text ?? (() => Promise.resolve('')),
  }
}

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  authMock.accessToken = null
  authMock.refreshToken = null
  authMock.pendingDeletion = false
  vi.stubGlobal('fetch', fetchMock)
})

describe('api client', () => {
  it('attaches the bearer token and parses the JSON body', async () => {
    authMock.accessToken = 'acc'
    fetchMock.mockResolvedValueOnce(
      res({ status: 200, text: () => Promise.resolve('{"a":1}') }),
    )

    const data = await api.get<{ a: number }>('/x')

    expect(data).toEqual({ a: 1 })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBe('Bearer acc')
  })

  it('omits the Authorization header when auth is disabled', async () => {
    authMock.accessToken = 'acc'
    fetchMock.mockResolvedValueOnce(res({ status: 204 }))

    await request('/public', { auth: false })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('returns undefined on a 204 No Content', async () => {
    fetchMock.mockResolvedValueOnce(res({ status: 204 }))
    await expect(api.get('/x')).resolves.toBeUndefined()
  })

  it('refreshes on a 401 then retries the original request', async () => {
    authMock.accessToken = 'stale'
    authMock.refreshToken = 'ref'
    fetchMock
      .mockResolvedValueOnce(res({ ok: false, status: 401 }))
      .mockResolvedValueOnce(
        res({
          json: () =>
            Promise.resolve({ access_token: 'a2', refresh_token: 'r2' }),
        }),
      )
      .mockResolvedValueOnce(
        res({ status: 200, text: () => Promise.resolve('{"ok":true}') }),
      )

    const data = await api.get<{ ok: boolean }>('/x')

    expect(data).toEqual({ ok: true })
    expect(authMock.setTokens).toHaveBeenCalledWith({
      access_token: 'a2',
      refresh_token: 'r2',
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('does not loop refreshing: a 401 on the retry is thrown', async () => {
    authMock.accessToken = 'stale'
    authMock.refreshToken = 'ref'
    fetchMock
      .mockResolvedValueOnce(res({ ok: false, status: 401 }))
      .mockResolvedValueOnce(
        res({
          json: () =>
            Promise.resolve({ access_token: 'a2', refresh_token: 'r2' }),
        }),
      )
      .mockResolvedValueOnce(res({ ok: false, status: 401 }))

    await expect(api.get('/x')).rejects.toMatchObject({ statusCode: 401 })
  })

  it('logs out and redirects when there is no refresh token', async () => {
    authMock.accessToken = 'stale'
    authMock.refreshToken = null
    fetchMock.mockResolvedValueOnce(res({ ok: false, status: 401 }))

    await expect(api.get('/x')).rejects.toMatchObject({ statusCode: 401 })
    expect(authMock.clear).toHaveBeenCalledTimes(1)
    expect(routerMock.push).toHaveBeenCalledWith('/login')
  })

  it('logs out and redirects when the refresh call fails', async () => {
    authMock.accessToken = 'stale'
    authMock.refreshToken = 'ref'
    fetchMock
      .mockResolvedValueOnce(res({ ok: false, status: 401 }))
      .mockResolvedValueOnce(res({ ok: false, status: 401 }))

    await expect(api.get('/x')).rejects.toMatchObject({ statusCode: 401 })
    expect(authMock.setTokens).not.toHaveBeenCalled()
    expect(authMock.clear).toHaveBeenCalledTimes(1)
    expect(routerMock.push).toHaveBeenCalledWith('/login')
  })

  it('flags the store on an ACCOUNT_PENDING_DELETION 403', async () => {
    fetchMock.mockResolvedValueOnce(
      res({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ code: 'ACCOUNT_PENDING_DELETION' }),
      }),
    )

    await expect(api.get('/x')).rejects.toMatchObject({ statusCode: 403 })
    expect(authMock.pendingDeletion).toBe(true)
  })

  it('joins an array error message', async () => {
    fetchMock.mockResolvedValueOnce(
      res({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: ['too short', 'invalid'] }),
      }),
    )

    await expect(api.get('/x')).rejects.toEqual({
      statusCode: 400,
      message: 'too short, invalid',
    })
  })

  it('passes a string error message through', async () => {
    fetchMock.mockResolvedValueOnce(
      res({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'boom' }),
      }),
    )

    await expect(api.get('/x')).rejects.toMatchObject({ message: 'boom' })
  })

  it('sends the JSON body and Content-Type on a POST', async () => {
    fetchMock.mockResolvedValueOnce(res({ status: 204 }))

    await api.post('/x', { a: 1 }, { auth: false })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/x')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe('{"a":1}')
  })
})
