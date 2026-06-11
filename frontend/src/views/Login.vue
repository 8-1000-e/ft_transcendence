<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL, ROUTES } from '@/api/routes'
import type { ApiError } from '@/types/auth'
import AuthShell from '@/components/auth/AuthShell.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

onMounted(() => {
  const err = route.query.error
  if (err === 'invalid_state') error.value = 'Session OAuth invalide, réessaie.'
  else if (err === 'ft_auth_failed') error.value = 'La connexion 42 a échoué.'
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    await router.push('/')
  } catch (e) {
    error.value = (e as ApiError).message ?? 'Identifiants invalides'
  } finally {
    loading.value = false
  }
}

function loginWith42() {
  window.location.href = `${API_BASE_URL}${ROUTES.auth.ft}`
}
</script>

<template>
  <AuthShell title="Connexion" subtitle="Content de te revoir.">
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm mb-1 text-muted" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 outline-none focus:border-accent"
        />
      </div>
      <div>
        <label class="block text-sm mb-1 text-muted" for="password">Mot de passe</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 outline-none focus:border-accent"
        />
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-accent hover:bg-accent-hover text-black font-semibold py-2 transition disabled:opacity-50"
      >
        {{ loading ? 'Connexion…' : 'Se connecter' }}
      </button>
    </form>

    <div class="flex items-center gap-3 my-5">
      <span class="h-px flex-1 bg-border" />
      <span class="text-xs text-muted">ou</span>
      <span class="h-px flex-1 bg-border" />
    </div>

    <button
      type="button"
      class="w-full rounded-lg border border-border bg-surface-2 hover:border-accent py-2 font-medium transition"
      @click="loginWith42"
    >
      Se connecter avec 42
    </button>

    <template #footer>
      Pas de compte ?
      <RouterLink to="/signup" class="text-accent hover:underline">Créer un compte</RouterLink>
    </template>
  </AuthShell>
</template>
