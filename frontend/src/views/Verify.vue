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
    error.value = (e as ApiError).message ?? 'Code invalide ou expiré'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell title="Vérification" :subtitle="`// code envoyé à ${email}`">
    <form class="ftp-form" @submit.prevent="submit">
      <div class="ftp-field">
        <label class="ftp-label" for="code">CODE (6 CHIFFRES)</label>
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
        {{ loading ? 'Vérification…' : 'Valider' }}
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
      Mauvais email ?
      <RouterLink to="/signup" class="ftp-link-strong">Recommencer</RouterLink>
    </template>
  </AuthShell>
</template>
