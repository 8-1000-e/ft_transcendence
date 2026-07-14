import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/api/client'
import { ROUTES, API_BASE_URL } from '@/api/routes'
import { disconnectRealtime } from '@/api/realtime'
import type { Tokens, User } from '@/types/auth'

const REFRESH_KEY = 'ft_refresh'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_KEY))
  const user = ref<User | null>(null)
  const pendingDeletion = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  function setTokens(tokens: Tokens) {
    accessToken.value = tokens.access_token
    refreshToken.value = tokens.refresh_token
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
  }

  function clear() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    pendingDeletion.value = false
    localStorage.removeItem(REFRESH_KEY)
    // Tear down the realtime socket so the next user gets a fresh client and
    // never reuses the previous session's authenticated Pusher connection.
    disconnectRealtime()
    // Reset the rest of the app's stores so a newly logged-in account never
    // inherits the previous session's cached data (groups, projects, messages)
    // — the "must Cmd+R when switching accounts" bug. Dynamic import breaks the
    // store<->store cycle, mirroring how the api client reaches this store.
    void import('@/stores/groups').then(({ useGroupsStore }) => {
      useGroupsStore().reset()
    })
  }

  async function fetchMe() {
    user.value = await api.get<User>(ROUTES.users.me)
    // Keep the pending-deletion barrier in sync with the loaded profile so a
    // user who logs back in sees the "scheduled for deletion" modal (and can
    // cancel) instead of a broken session.
    pendingDeletion.value = !!user.value?.pendingDeletion
  }

  // Heartbeat: touch lastSeenAt so friends see us as online (2-min window).
  // Best-effort — a failed ping must never disrupt the UI.
  async function ping(): Promise<void> {
    try {
      await api.post(ROUTES.users.ping)
    } catch {
      /* ignore */
    }
  }

  async function login(email: string, password: string) {
    const tokens = await api.post<Tokens>(
      ROUTES.auth.login,
      { email, password },
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

  // Start the 42 OAuth "link to current account" flow. Refreshes the access
  // token first so the short-lived token in the redirect URL is always valid.
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
    signup,
    verify,
    logout,
    cancelDeletion,
    link42,
    tryRestoreSession,
  }
})
