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
  <AuthShell title="Connexion" subtitle="// content de te revoir, étudiant.">
    <form class="ftp-form" @submit.prevent="submit">
      <div class="ftp-field">
        <label class="ftp-label" for="email">E-MAIL</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="ftp-input"
          placeholder="prenom@student.42.fr"
        />
      </div>

      <div class="ftp-field">
        <div class="ftp-field-row">
          <label class="ftp-label" for="password">MOT DE PASSE</label>
          <a href="#" class="ftp-link">Oublié ?</a>
        </div>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="ftp-input"
          placeholder="••••••••"
        />
      </div>

      <p v-if="error" class="ftp-error">! {{ error }}</p>

      <button type="submit" :disabled="loading" class="ftp-btn">
        {{ loading ? 'Connexion…' : 'Se connecter' }}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12h13M13 6l6 6-6 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </form>

    <div class="ftp-divider">
      <span class="ftp-divider-line"></span>
      <span class="ftp-divider-text">ou</span>
      <span class="ftp-divider-line"></span>
    </div>

    <button type="button" class="ftp-btn-42" @click="loginWith42">
      <span class="ftp-42-badge">42</span>
      Se connecter avec 42
    </button>

    <template #footer>
      Pas de compte ?
      <RouterLink to="/signup" class="ftp-link-strong">Créer un compte</RouterLink>
    </template>
  </AuthShell>
</template>
