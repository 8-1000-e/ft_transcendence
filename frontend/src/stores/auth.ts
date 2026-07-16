import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/api/client'
import { ROUTES, API_BASE_URL } from '@/api/routes'
import { disconnectRealtime } from '@/api/realtime'
import { setLocale, LOCALES } from '@/i18n'
import type { Tokens, User } from '@/types/auth'

const REFRESH_KEY = 'ft_refresh'
const ACCESS_KEY = 'ft_access'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem(ACCESS_KEY))
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_KEY))
  const user = ref<User | null>(null)
  const pendingDeletion = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  function setTokens(tokens: Tokens) {
    accessToken.value = tokens.access_token
    refreshToken.value = tokens.refresh_token
    localStorage.setItem(ACCESS_KEY, tokens.access_token)
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
  }

  function clear() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    pendingDeletion.value = false
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    // Tear down the socket so the next user never reuses this authed connection.
    disconnectRealtime()
    // Reset other stores so a new login doesn't inherit cached data; dynamic import breaks the store<->store cycle.
    void import('@/stores/groups').then(({ useGroupsStore }) => {
      useGroupsStore().reset()
    })
  }

  async function fetchMe() {
    user.value = await api.get<User>(ROUTES.users.me)
    // Sync the pending-deletion barrier so a returning user still sees the cancel modal.
    pendingDeletion.value = !!user.value?.pendingDeletion
    // Apply this user's saved language (per-account); guard against an unknown value.
    const srv = user.value?.locale
    if (srv && LOCALES.some((l) => l.code === srv)) setLocale(srv)
  }

  // Heartbeat: touch lastSeenAt (2-min online window); best-effort, ignore failures.
  async function ping(): Promise<void> {
    try {
      await api.post(ROUTES.users.ping)
    } catch {
      /* ignore */
    }
  }

  async function login(
    email: string,
    password: string,
  ): Promise<{ twoFactorRequired: boolean }> {
    const res = await api.post<Tokens & { twoFactorRequired?: boolean }>(
      ROUTES.auth.login,
      { email, password },
      { auth: false },
    )
    // 2FA-enabled account: no tokens yet — the caller must collect a code and
    // call loginTwoFactor(). Password is re-sent there (stateless, no pending token).
    if (res.twoFactorRequired) return { twoFactorRequired: true }
    setTokens(res)
    await fetchMe()
    return { twoFactorRequired: false }
  }

  async function loginTwoFactor(email: string, password: string, code: string) {
    const tokens = await api.post<Tokens>(
      ROUTES.auth.login2fa,
      { email, password, code },
      { auth: false },
    )
    setTokens(tokens)
    await fetchMe()
  }

  async function signup(email: string, password: string, name: string) {
    await api.post<{ message: string }>(
      ROUTES.auth.signup,
      { email, password, name },
      { auth: false },
    )
  }

  async function verify(email: string, code: string) {
    const tokens = await api.post<Tokens>(
      ROUTES.auth.verify,
      { email, code },
      { auth: false },
    )
    setTokens(tokens)
    await fetchMe()
  }

  async function logout() {
    try {
      if (refreshToken.value) {
        await api.post(ROUTES.auth.logout, { refresh_token: refreshToken.value })
      }
    } finally {
      clear()
    }
  }

  async function cancelDeletion() {
    await api.post(ROUTES.users.cancelDelete)
    pendingDeletion.value = false
  }

  // Refresh the token first so the short-lived one in the 42-link redirect URL is valid.
  async function link42(): Promise<void> {
    try {
      if (refreshToken.value) {
        const tokens = await api.post<Tokens>(
          ROUTES.auth.refresh,
          { refresh_token: refreshToken.value },
          { auth: false },
        )
        setTokens(tokens)
      }
    } catch {
      /* fall through with the current token */
    }
    window.location.href = `${API_BASE_URL}/auth/42/link?token=${encodeURIComponent(accessToken.value ?? '')}`
  }

  async function tryRestoreSession(): Promise<boolean> {
    if (!refreshToken.value) return false
    // Reuse a still-valid access token first: this avoids a /refresh (and its
    // token rotation) on every page reload, which races on spam-reload and logs
    // the user out. fetchMe() auto-refreshes via the client only if it 401s.
    if (accessToken.value) {
      try {
        await fetchMe()
        return true
      } catch {
        /* access token dead → fall through to an explicit refresh */
      }
    }
    try {
      const tokens = await api.post<Tokens>(
        ROUTES.auth.refresh,
        { refresh_token: refreshToken.value },
        { auth: false },
      )
      setTokens(tokens)
      await fetchMe()
      return true
    } catch {
      clear()
      return false
    }
  }

  return {
    accessToken,
    refreshToken,
    user,
    pendingDeletion,
    isAuthenticated,
    setTokens,
    clear,
    fetchMe,
    ping,
    login,
    loginTwoFactor,
    signup,
    verify,
    logout,
    cancelDeletion,
    link42,
    tryRestoreSession,
  }
})
