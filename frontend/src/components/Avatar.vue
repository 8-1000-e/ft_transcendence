<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { API_BASE_URL } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'

/**
 * Renders a user's 42 profile picture, loaded through the authenticated,
 * proxied `GET /avatar/:userId` endpoint (never a raw 42 CDN URL). On 404 /
 * error / empty response — or when no `userId` is known — it falls back to the
 * initials of `name`. Visual skin (shape, colour, shadow) comes from the class
 * the call site passes; `size` drives the pixel dimensions.
 */
const props = withDefaults(
  defineProps<{ userId: string; name: string; size?: number }>(),
  { size: 40 },
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
  const id = props.userId
  if (!id) return
  try {
    const res = await fetch(`${API_BASE_URL}/avatar/${id}`, {
      headers: auth.accessToken
        ? { Authorization: `Bearer ${auth.accessToken}` }
        : {},
    })
    // 404 = user has no 42 picture; any other failure is equally a fallback.
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

watch(() => props.userId, load, { immediate: true })
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
