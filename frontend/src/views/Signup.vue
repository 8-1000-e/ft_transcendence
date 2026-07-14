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
    error.value = (e as ApiError).message ?? 'Sign-up failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell title="Sign up" subtitle="// create your student account.">
    <form class="ftp-form" @submit.prevent="submit">
      <div class="ftp-field">
        <label class="ftp-label" for="name">NAME</label>
        <input
          id="name"
          v-model="name"
          type="text"
          required
          minlength="2"
          class="ftp-input"
          placeholder="your name"
        />
      </div>

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
        <label class="ftp-label" for="password">PASSWORD</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
          class="ftp-input"
          placeholder="••••••••"
        />
        <p class="ftp-hint">8 characters minimum.</p>
      </div>

      <p v-if="error" class="ftp-error">! {{ error }}</p>

      <button type="submit" :disabled="loading" class="ftp-btn">
        {{ loading ? 'Sending…' : 'Create my account' }}
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

    <template #footer>
      Already registered?
      <RouterLink to="/login" class="ftp-link-strong">Log in</RouterLink>
    </template>
  </AuthShell>
</template>
