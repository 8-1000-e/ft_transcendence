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
  <AuthShell
    title="Vérifie ton email"
    :subtitle="`Code envoyé à ${email}`"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm mb-1 text-muted" for="code">Code (6 chiffres)</label>
        <input
          id="code"
          v-model="code"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          required
          class="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-center text-2xl tracking-[0.5em] outline-none focus:border-accent"
        />
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-accent hover:bg-accent-hover text-black font-semibold py-2 transition disabled:opacity-50"
      >
        {{ loading ? 'Vérification…' : 'Valider' }}
      </button>
    </form>

    <template #footer>
      Mauvais email ?
      <RouterLink to="/signup" class="text-accent hover:underline">Recommencer</RouterLink>
    </template>
  </AuthShell>
</template>
