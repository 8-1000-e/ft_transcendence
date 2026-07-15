<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/types/auth'
import AuthShell from '@/components/auth/AuthShell.vue'
import { useI18n } from '@/i18n'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

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
    error.value = (e as ApiError).message ?? t('auth.signup.err.failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell :title="$t('auth.signup.title')" :subtitle="$t('auth.signup.subtitle')">
    <form class="ftp-form" @submit.prevent="submit">
      <div class="ftp-field">
        <label class="ftp-label" for="name">{{ $t('auth.field.name') }}</label>
        <input
          id="name"
          v-model="name"
          type="text"
          required
          minlength="2"
          class="ftp-input"
          :placeholder="$t('auth.field.name.ph')"
        />
      </div>

      <div class="ftp-field">
        <label class="ftp-label" for="email">{{ $t('auth.field.email') }}</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="ftp-input"
          :placeholder="$t('auth.field.email.ph')"
        />
      </div>

      <div class="ftp-field">
        <label class="ftp-label" for="password">{{ $t('auth.field.password') }}</label>
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
        <p class="ftp-hint">{{ $t('auth.field.password.hint') }}</p>
      </div>

      <p v-if="error" class="ftp-error" role="alert">! {{ error }}</p>

      <button type="submit" :disabled="loading" class="ftp-btn">
        {{ loading ? $t('auth.signup.loading') : $t('auth.signup.submit') }}
        <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none">
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
      {{ $t('auth.signup.already') }}
      <RouterLink to="/login" class="ftp-link-strong">{{ $t('auth.login.title') }}</RouterLink>
    </template>
  </AuthShell>
</template>
