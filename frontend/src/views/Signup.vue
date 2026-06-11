<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/types/auth'
import AuthShell from '@/components/auth/AuthShell.vue'

const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.signup(email.value, password.value, name.value)
    await router.push({ name: 'verify', query: { email: email.value } })
  } catch (e) {
    error.value = (e as ApiError).message ?? 'Inscription impossible'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell title="Créer un compte" subtitle="Rejoins la communauté.">
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm mb-1 text-muted" for="name">Nom</label>
        <input
          id="name"
          v-model="name"
          type="text"
          required
          minlength="2"
          class="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 outline-none focus:border-accent"
        />
      </div>
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
          minlength="8"
          autocomplete="new-password"
          class="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 outline-none focus:border-accent"
        />
        <p class="text-xs text-muted mt-1">8 caractères minimum.</p>
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-accent hover:bg-accent-hover text-black font-semibold py-2 transition disabled:opacity-50"
      >
        {{ loading ? 'Envoi…' : 'Créer mon compte' }}
      </button>
    </form>

    <template #footer>
      Déjà inscrit ?
      <RouterLink to="/login" class="text-accent hover:underline">Se connecter</RouterLink>
    </template>
  </AuthShell>
</template>
