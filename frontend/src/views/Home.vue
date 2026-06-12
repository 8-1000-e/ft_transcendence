<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function logout() {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
    <div class="text-center">
      <p class="text-muted text-sm">Connecté en tant que</p>
      <p class="text-2xl font-semibold">{{ auth.user?.name }}</p>
      <p class="text-muted text-sm">{{ auth.user?.email }}</p>
      <p v-if="auth.user?.ftId" class="text-accent text-sm mt-1">Compte 42 ✓</p>
    </div>
    <button
      class="rounded-lg border border-border bg-surface-2 hover:border-accent px-4 py-2 transition"
      @click="logout"
    >
      Se déconnecter
    </button>
  </div>
</template>
