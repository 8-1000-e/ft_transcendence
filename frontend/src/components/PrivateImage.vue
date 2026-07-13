<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { API_BASE_URL } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ path: string }>()
const auth = useAuthStore()
const src = ref('')
let objUrl = ''

async function load() {
  try {
    const res = await fetch(`${API_BASE_URL}${props.path}`, {
      headers: auth.accessToken
        ? { Authorization: `Bearer ${auth.accessToken}` }
        : {},
    })
    if (!res.ok) return
    const blob = await res.blob()
    if (objUrl) URL.revokeObjectURL(objUrl)
    objUrl = URL.createObjectURL(blob)
    src.value = objUrl
  } catch {
    /* ignore */
  }
}

watch(() => props.path, load, { immediate: true })
onBeforeUnmount(() => {
  if (objUrl) URL.revokeObjectURL(objUrl)
})
</script>

<template>
  <img v-if="src" :src="src" class="private-img" alt="" />
</template>

<style scoped>
.private-img {
  max-width: 240px;
  border-radius: 8px;
  margin-top: 6px;
  display: block;
}
</style>
