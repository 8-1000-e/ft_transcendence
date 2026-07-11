<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import type { PublicUser } from '@/types/api'

const route = useRoute()
const router = useRouter()
const user = ref<PublicUser | null>(null)
const loading = ref(false)
const error = ref('')

function initials(n?: string | null): string {
  if (!n) return '??'
  return n.trim().slice(0, 2).toUpperCase()
}

async function load() {
  loading.value = true
  error.value = ''
  user.value = null
  try {
    user.value = await api.get<PublicUser>(
      ROUTES.users.byId(route.params.id as string),
    )
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Profile not found'
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, load, { immediate: true })
</script>

<template>
  <section class="wrap">
    <button class="back" @click="router.back()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" /></svg>
      retour
    </button>

    <p v-if="loading" class="muted">Loading…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="user" class="card">
      <div class="glow"></div>
      <img v-if="user.ftPfpUrl" :src="user.ftPfpUrl" class="pp" alt="" />
      <span v-else class="av">{{ initials(user.name) }}</span>
      <h1 class="name">{{ user.name }}</h1>
      <p v-if="user.campus" class="campus">{{ user.campus }}</p>
      <p v-if="user.createdAt" class="since">member since {{ user.createdAt.slice(0, 10) }}</p>
    </div>
  </section>
</template>

<style scoped>
.wrap {
  max-width: 420px;
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: none;
  border: none;
  color: #74747e;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 18px;
}
.back:hover {
  color: #8c97f7;
}
.card {
  position: relative;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(17, 17, 21, 0.72);
  padding: 30px;
  text-align: center;
  overflow: hidden;
}
.glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 84px;
  background: radial-gradient(60% 100% at 50% 0%, rgba(110, 123, 242, 0.22), transparent 70%);
}
.pp,
.av {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 22px;
  box-shadow: 0 12px 30px -12px rgba(110, 123, 242, 0.7);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  object-fit: cover;
}
.av {
  background: linear-gradient(135deg, #5e6cf0, #8c97f7);
  font-family: 'JetBrains Mono', monospace;
  font-size: 30px;
  font-weight: 700;
  color: #fff;
}
.name {
  font-size: 22px;
  font-weight: 700;
  color: #f6f6f7;
  margin: 16px 0 4px;
}
.campus {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  color: #74747e;
  margin: 0 0 6px;
}
.since {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: #5c5c66;
  margin: 0;
}
.muted {
  color: #74747e;
}
.error {
  color: #ef6d72;
}
</style>
