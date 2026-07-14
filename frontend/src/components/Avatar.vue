<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { API_BASE_URL } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'

// 42 avatar via the auth-proxied endpoint (never a raw CDN URL); falls back to initials of `name`.
// userId → app-user picture (GET /avatar/:id, RGPD-gated); pfpUrl → raw 42-CDN url proxied SSRF-safe, takes precedence.
const props = withDefaults(
  defineProps<{ userId?: string; pfpUrl?: string; name: string; size?: number }>(),
  { size: 40, userId: '', pfpUrl: '' },
)

const auth = useAuthStore()
const src = ref('')
const loaded = ref(false)
let objUrl = ''

function initials(n: string): string {
  const s = (n ?? '').trim()
  if (!s) return '??'
  const parts = s.split(/\s+/)
  const first = parts[0] ?? ''
  const last = parts[parts.length - 1] ?? ''
  const a = first[0] ?? ''
  const b = parts.length > 1 ? last[0] ?? '' : first[1] ?? ''
  return (a + b).toUpperCase() || '??'
}

function revoke() {
  if (objUrl) {
    URL.revokeObjectURL(objUrl)
    objUrl = ''
  }
}

async function load() {
  loaded.value = false
  revoke()
  src.value = ''
  const url = props.pfpUrl
    ? `${API_BASE_URL}/ft-avatar?url=${encodeURIComponent(props.pfpUrl)}`
    : props.userId
      ? `${API_BASE_URL}/avatar/${props.userId}`
      : ''
  if (!url) return
  try {
    const res = await fetch(url, {
      headers: auth.accessToken
        ? { Authorization: `Bearer ${auth.accessToken}` }
        : {},
    })
    // 404 = no picture (or a non-42 viewer denied one); any failure = fallback.
    if (!res.ok) return
    const blob = await res.blob()
    if (!blob.size) return
    objUrl = URL.createObjectURL(blob)
    src.value = objUrl
    loaded.value = true
  } catch {
    /* network error → keep the initials fallback */
  }
}

watch(() => [props.userId, props.pfpUrl], load, { immediate: true })
onBeforeUnmount(revoke)
</script>

<template>
  <span class="avatar-root" :style="{ width: size + 'px', height: size + 'px' }">
    <img
      v-if="loaded"
      class="avatar-img"
      :src="src"
      :alt="`Profile picture of ${name}`"
      @error="loaded = false"
    />
    <template v-else>{{ initials(name) }}</template>
  </span>
</template>

<style scoped>
.avatar-root {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
}
.avatar-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
</style>
