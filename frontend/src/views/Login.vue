<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL, ROUTES } from '@/api/routes'
import type { ApiError } from '@/types/auth'
import AuthShell from '@/components/auth/AuthShell.vue'
import { useI18n } from '@/i18n'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const code = ref('')
const twoFaStep = ref(false)
const error = ref('')
const loading = ref(false)

onMounted(() => {
  const err = route.query.error
  if (err === 'invalid_state') error.value = t('auth.login.err.invalidState')
  else if (err === 'ft_auth_failed') error.value = t('auth.login.err.ftFailed')
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const r = await auth.login(email.value, password.value)
    if (r.twoFactorRequired) twoFaStep.value = true
    else await router.push('/')
  } catch (e) {
    error.value = (e as ApiError).message ?? t('auth.login.err.invalidCreds')
  } finally {
    loading.value = false
  }
}

async function submitTwoFa() {
  error.value = ''
  loading.value = true
  try {
    await auth.loginTwoFactor(email.value, password.value, code.value)
    await router.push('/')
  } catch (e) {
    error.value = (e as ApiError).message ?? t('auth.login.err.invalidCode')
  } finally {
    loading.value = false
  }
}

function loginWith42() {
  window.location.href = `${API_BASE_URL}${ROUTES.auth.ft}`
}
</script>

<template>
  <AuthShell :title="$t('auth.login.title')" :subtitle="$t('auth.login.subtitle')">
    <form v-if="!twoFaStep" class="ftp-form" @submit.prevent="submit">
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
        <div class="ftp-field-row">
          <label class="ftp-label" for="password">{{ $t('auth.field.password') }}</label>
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

      <p v-if="error" class="ftp-error" role="alert">! {{ error }}</p>

      <button type="submit" :disabled="loading" class="ftp-btn">
        {{ loading ? $t('auth.login.loading') : $t('auth.login.title') }}
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

    <form v-else class="ftp-form" @submit.prevent="submitTwoFa">
      <div class="ftp-field">
        <label class="ftp-label" for="totp">{{ $t('auth.login.2fa.label') }}</label>
        <input
          id="totp"
          v-model="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          required
          class="ftp-input"
          :placeholder="$t('auth.login.2fa.ph')"
        />
        <p class="ftp-hint">{{ $t('auth.login.2fa.hint') }}</p>
      </div>

      <p v-if="error" class="ftp-error" role="alert">! {{ error }}</p>

      <button type="submit" :disabled="loading" class="ftp-btn">
        {{ loading ? $t('auth.login.loading') : $t('auth.login.2fa.verify') }}
      </button>
    </form>

    <template v-if="!twoFaStep">
      <div class="ftp-divider">
        <span class="ftp-divider-line"></span>
        <span class="ftp-divider-text">{{ $t('auth.or') }}</span>
        <span class="ftp-divider-line"></span>
      </div>

      <button type="button" class="ftp-btn-42" @click="loginWith42">
        <span class="ftp-42-badge">42</span>
        {{ $t('auth.login.with42') }}
      </button>
    </template>

    <template #footer>
      {{ $t('auth.login.noAccount') }}
      <RouterLink to="/signup" class="ftp-link-strong">{{ $t('auth.login.createAccount') }}</RouterLink>
    </template>
  </AuthShell>
</template>
