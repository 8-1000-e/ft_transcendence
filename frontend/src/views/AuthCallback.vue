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

  auth.setTokens({ access_token, refresh_token })
  history.replaceState(null, '', window.location.pathname)

  try {
    await auth.fetchMe()
    await router.replace('/')
  } catch {
    auth.clear()
    await router.replace({ name: 'login', query: { error: 'ft_auth_failed' } })
  }
})
</script>

<template>
  <div class="callback">
    <div class="brand">
      <span class="brand-mark">H</span>
      <span class="brand-word">Hub<span class="brand-accent">42</span></span>
    </div>
    <p class="hint mono">Signing you in…</p>
  </div>
</template>

<style scoped>
.callback {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: var(--color-bg);
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--color-accent);
  color: #fff;
  font-weight: 800;
  font-size: 18px;
}
.brand-word {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
}
.brand-accent {
  color: var(--color-accent);
}
.hint {
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--color-muted);
}
</style>
