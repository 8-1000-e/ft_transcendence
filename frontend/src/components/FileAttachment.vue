<script setup lang="ts">
// A non-image upload, shown as a downloadable chip. Public forum files can be
// linked directly; group-chat files sit behind a JWT-gated endpoint, so they are
// fetched with the bearer token and handed to the browser as a blob.
import { ref } from 'vue'
import { API_BASE_URL } from '@/api/routes'
import { fileLabel } from '@/api/upload'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ path: string }>()
const auth = useAuthStore()
const busy = ref(false)

const isPrivate = props.path.startsWith('/files/')
const href = `${API_BASE_URL}${props.path}`
const name = fileLabel(props.path)

async function download(e: MouseEvent) {
  if (!isPrivate || busy.value) return
  e.preventDefault()
  busy.value = true
  try {
    const res = await fetch(href, {
      headers: auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {},
    })
    if (!res.ok) return
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    /* offer nothing rather than a broken state */
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <a
    class="file-chip"
    :href="href"
    :download="name"
    target="_blank"
    rel="noopener noreferrer"
    @click="download"
  >
    <svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M14 3v5h5M14 3H6v18h12V8l-4-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
    </svg>
    <span class="file-name">{{ name }}</span>
    <span class="file-dl">↓</span>
  </a>
</template>

<style scoped>
.file-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  margin-top: 8px;
  padding: 7px 11px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 13px;
  text-decoration: none;
}
.file-chip:hover {
  border-color: var(--accent);
  color: var(--text);
}
.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-dl {
  color: var(--muted);
}
</style>
