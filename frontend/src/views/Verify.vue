<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/types/auth'
import AuthShell from '@/components/auth/AuthShell.vue'
import { useI18n } from '@/i18n'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

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
    error.value = (e as ApiError).message ?? t('auth.verify.err.invalidCode')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell :title="$t('auth.verify.title')" :subtitle="$t('auth.verify.subtitle', { email })">
    <form class="ftp-form" @submit.prevent="submit">
      <div class="ftp-field">
        <label class="ftp-label" for="code">{{ $t('auth.verify.codeLabel') }}</label>
        <input
          id="code"
          v-model="code"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          required
          class="ftp-input ftp-code"
          placeholder="000000"
        />
      </div>

      <p v-if="error" class="ftp-error">! {{ error }}</p>

      <button type="submit" :disabled="loading" class="ftp-btn">
        {{ loading ? $t('auth.verify.loading') : $t('auth.verify.submit') }}
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
      {{ $t('auth.verify.wrongEmail') }}
      <RouterLink to="/signup" class="ftp-link-strong">{{ $t('auth.verify.startOver') }}</RouterLink>
    </template>
  </AuthShell>
</template>
