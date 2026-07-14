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
    error.value = (e as ApiError).message ?? 'Could not sign up'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell title="Sign up" subtitle="// create your account">
    <form class="form" @submit.prevent="submit">
      <div class="field">
        <label class="label" for="name">NAME</label>
        <input
          id="name"
          v-model="name"
          type="text"
          required
          minlength="2"
          class="input"
          placeholder="your name"
        />
      </div>

      <div class="field">
        <label class="label" for="email">EMAIL</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="input"
          placeholder="you@student.42.fr"
        />
      </div>

      <div class="field">
        <label class="label" for="password">PASSWORD</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="8"
          autocomplete="new-password"
          class="input"
          placeholder="••••••••"
        />
        <p class="hint">8 characters minimum.</p>
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>

      <button type="submit" :disabled="loading" class="btn">
        {{ loading ? 'Sending…' : 'Create account' }}
      </button>
    </form>

    <template #footer>
      Already have an account?
      <RouterLink to="/login" class="link">Sign in</RouterLink>
    </template>
  </AuthShell>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.hint {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-muted);
}
.btn {
  width: 100%;
  margin-top: 2px;
}
</style>
