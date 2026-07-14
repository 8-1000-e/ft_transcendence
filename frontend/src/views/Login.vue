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
  if (err === 'invalid_state') error.value = 'Invalid OAuth session, please try again.'
  else if (err === 'ft_auth_failed') error.value = 'Sign in with 42 failed.'
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    await router.push('/')
  } catch (e) {
    error.value = (e as ApiError).message ?? 'Invalid credentials'
  } finally {
    loading.value = false
  }
}

function loginWith42() {
  window.location.href = `${API_BASE_URL}${ROUTES.auth.ft}`
}
</script>

<template>
  <AuthShell title="Sign in" subtitle="// welcome back">
    <form class="form" @submit.prevent="submit">
      <div class="field">
        <label class="label" for="email">EMAIL</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="input"
          placeholder="name@student.42.fr"
        />
      </div>

      <div class="field">
        <div class="field-row">
          <label class="label" for="password">PASSWORD</label>
          <a href="#" class="link forgot">Forgot?</a>
        </div>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="input"
          placeholder="••••••••"
        />
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>

      <button type="submit" :disabled="loading" class="btn submit">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    <div class="divider">
      <span class="divider-line"></span>
      <span class="divider-text">or</span>
      <span class="divider-line"></span>
    </div>

    <button type="button" class="btn-ghost btn-42" @click="loginWith42">
      <span class="mark-42">42</span>
      Continue with 42
    </button>

    <template #footer>
      No account?
      <RouterLink to="/signup" class="link">Create one</RouterLink>
    </template>
  </AuthShell>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.forgot {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
}
.submit {
  width: 100%;
  margin-top: 4px;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: var(--color-border);
}
.divider-text {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--color-muted);
}

.btn-42 {
  width: 100%;
}
.mark-42 {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-strong);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-dim);
}
</style>
