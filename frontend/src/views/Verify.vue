<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/types/auth'
import AuthShell from '@/components/auth/AuthShell.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const code = ref('')
const error = ref('')
const loading = ref(false)

onMounted(() => {
  email.value = (route.query.email as string) ?? ''
  if (!email.value) router.replace('/signup')
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.verify(email.value, code.value)
    await router.push('/')
  } catch (e) {
    error.value = (e as ApiError).message ?? 'Invalid or expired code'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell title="Verify" :subtitle="`// code sent to ${email}`">
    <form class="form" @submit.prevent="submit">
      <div class="field">
        <label class="label" for="code">CODE (6 DIGITS)</label>
        <input
          id="code"
          v-model="code"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          required
          class="input code-input"
          placeholder="000000"
        />
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>

      <button type="submit" :disabled="loading" class="btn">
        {{ loading ? 'Verifying…' : 'Verify' }}
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
      Wrong email?
      <RouterLink to="/signup" class="link">Start over</RouterLink>
    </template>
  </AuthShell>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.btn {
  width: 100%;
}
.code-input {
  font-family: var(--font-mono);
  font-size: 20px;
  text-align: center;
  letter-spacing: 0.6em;
  text-indent: 0.6em;
}
</style>
