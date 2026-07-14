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
      back
    </button>

    <p v-if="loading" class="muted">Loading…</p>
    <p v-if="error" class="error-text">{{ error }}</p>

    <div v-if="user" class="card card-pad profile">
      <img v-if="user.ftPfpUrl" :src="user.ftPfpUrl" class="avatar pp" alt="" />
      <span v-else class="avatar av">{{ initials(user.name) }}</span>
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
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 18px;
  transition: color 0.14s;
}
.back:hover {
  color: var(--color-text-dim);
}
.profile {
  padding: 30px;
  text-align: center;
}
.pp,
.av {
  width: 88px;
  height: 88px;
  border-radius: 22px;
  object-fit: cover;
}
.av {
  font-size: 30px;
}
.name {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  margin: 16px 0 4px;
}
.campus {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--color-text-dim);
  margin: 0 0 6px;
}
.since {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--color-muted);
  margin: 0;
}
</style>
