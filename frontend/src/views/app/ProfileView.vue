<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const name = ref(auth.user?.name ?? '')
const message = ref('')
const error = ref('')

async function saveName() {
  message.value = ''
  error.value = ''
  try {
    await api.patch(ROUTES.users.updateMe, { name: name.value })
    await auth.fetchMe()
    message.value = 'Profil mis à jour.'
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Échec de la mise à jour'
  }
}

async function requestDeletion() {
  if (!confirm('Programmer la suppression du compte (14 jours) ?')) return
  message.value = ''
  error.value = ''
  try {
    const res = await api.del<{ message: string }>(ROUTES.users.deleteMe)
    message.value = res?.message ?? 'Suppression programmée.'
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Échec'
  }
}

async function cancelDeletion() {
  message.value = ''
  error.value = ''
  try {
    const res = await api.post<{ message: string }>(ROUTES.users.cancelDelete)
    message.value = res?.message ?? 'Suppression annulée.'
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Échec'
  }
}

async function logout() {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <section class="profile">
    <h1 class="title">Mon profil</h1>

    <dl class="info">
      <dt>Email</dt>
      <dd>{{ auth.user?.email }}</dd>
      <dt>Membre depuis</dt>
      <dd>{{ auth.user?.createdAt?.slice(0, 10) }}</dd>
    </dl>

    <form class="row" @submit.prevent="saveName">
      <input v-model="name" class="input" placeholder="Nom" />
      <button class="btn">Enregistrer</button>
    </form>

    <p v-if="message" class="ok">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="danger">
      <button class="btn-ghost" @click="logout">Se déconnecter</button>
      <button class="btn-ghost" @click="cancelDeletion">Annuler la suppression</button>
      <button class="btn-danger" @click="requestDeletion">Supprimer mon compte</button>
    </div>
  </section>
</template>

<style scoped>
.title {
  font-size: 22px;
  margin: 0 0 16px;
}
.info {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 6px 12px;
  margin: 0 0 20px;
}
.info dt {
  color: var(--color-muted);
  font-size: 13px;
}
.info dd {
  margin: 0;
}
.row {
  display: flex;
  gap: 8px;
  max-width: 420px;
}
.input {
  flex: 1;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: #f3f3f4;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
}
.btn {
  border: none;
  background: var(--color-accent);
  color: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}
.ok {
  color: #5ee08a;
}
.error {
  color: #ef6d72;
}
.danger {
  display: flex;
  gap: 10px;
  margin-top: 28px;
  flex-wrap: wrap;
}
.btn-ghost,
.btn-danger {
  border: 1px solid var(--color-border);
  background: none;
  color: #d6d6da;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}
.btn-danger {
  border-color: #ef6d72;
  color: #ef6d72;
}
</style>
