<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

onMounted(async () => {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const params = new URLSearchParams(hash)
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')

  if (!access_token || !refresh_token) {
    await router.replace({ name: 'login', query: { error: 'ft_auth_failed' } })
    return
  }

  const linked = params.get('linked') === '1'
  auth.setTokens({ access_token, refresh_token })
  history.replaceState(null, '', window.location.pathname)

  try {
    await auth.fetchMe()
    // A successful 42-link lands back on Settings with a confirmation, not home.
    await router.replace(linked ? { name: 'settings', query: { linked: '1' } } : '/')
  } catch {
    if (linked) {
      // The link already succeeded and tokens are valid — a transient /me failure must NOT log the user out.
      try {
        await auth.fetchMe()
      } catch {
        /* keep the session; Settings will retry on its own load */
      }
      await router.replace({ name: 'settings', query: { linked: '1' } })
    } else {
      auth.clear()
      await router.replace({ name: 'login', query: { error: 'ft_auth_failed' } })
    }
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center text-muted">
    Signing in…
  </div>
</template>
