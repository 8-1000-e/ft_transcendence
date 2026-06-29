<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import type { PublicUser } from '@/types/api'

const route = useRoute()
const user = ref<PublicUser | null>(null)
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  user.value = null
  try {
    user.value = await api.get<PublicUser>(
      ROUTES.users.byId(route.params.id as string),
    )
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Profil introuvable'
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, load, { immediate: true })
</script>

<template>
  <section>
    <p v-if="loading" class="muted">Chargement…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="user" class="card">
      <img v-if="user.ftPfpUrl" :src="user.ftPfpUrl" class="pp" alt="" />
      <h1 class="name">{{ user.name }}</h1>
      <p v-if="user.campus" class="muted">{{ user.campus }}</p>
      <p v-if="user.createdAt" class="muted">
        Membre depuis {{ user.createdAt.slice(0, 10) }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  background: var(--color-surface);
  max-width: 360px;
}
.pp {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin-bottom: 12px;
}
.name {
  font-size: 22px;
  margin: 0 0 4px;
}
.muted {
  color: var(--color-muted);
}
.error {
  color: #ef6d72;
}
</style>
