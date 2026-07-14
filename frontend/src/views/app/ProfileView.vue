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
const showDelete = ref(false)

function initials(n?: string | null): string {
  if (!n) return '??'
  return n.trim().slice(0, 2).toUpperCase()
}

async function saveName() {
  message.value = ''
  error.value = ''
  try {
    await api.patch(ROUTES.users.updateMe, { name: name.value })
    await auth.fetchMe()
    message.value = 'Profile updated.'
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Update failed'
  }
}

async function confirmDeletion() {
  message.value = ''
  error.value = ''
  showDelete.value = false
  try {
    const res = await api.del<{ message: string }>(ROUTES.users.deleteMe)
    message.value = res?.message ?? 'Deletion scheduled.'
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed'
  }
}

async function cancelDeletion() {
  message.value = ''
  error.value = ''
  try {
    const res = await api.post<{ message: string }>(ROUTES.users.cancelDelete)
    message.value = res?.message ?? 'Deletion cancelled.'
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed'
  }
}

async function logout() {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <section class="profile">
    <h1 class="title">My profile</h1>
    <p class="sub">// manage your Hub42 account.</p>

    <div class="card card-pad">
      <div class="ident">
        <span class="avatar av">{{ initials(auth.user?.name) }}</span>
        <div class="ident-info">
          <div class="ident-name">{{ auth.user?.name }}</div>
          <div class="ident-mail">
            {{ auth.user?.email }}
            <span v-if="auth.user?.createdAt"> · since {{ auth.user.createdAt.slice(0, 10) }}</span>
          </div>
        </div>
      </div>

      <div class="field">
        <label class="label">Display name</label>
        <div class="row">
          <input v-model="name" class="input" placeholder="Name" />
          <button class="btn" @click="saveName">Save</button>
        </div>
      </div>
      <p v-if="message" class="ok">{{ message }}</p>
      <p v-if="error" class="error-text form-error">{{ error }}</p>
    </div>

    <div class="card card-pad danger">
      <div class="danger-head">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 2 20h20L12 3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /><path d="M12 10v4M12 17h0" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" /></svg>
        <span class="section-title danger-lab">Danger zone</span>
      </div>
      <p class="danger-text">
        Account deletion takes effect after a grace period (14 days). You can
        cancel while the grace period is running; your content is anonymized.
      </p>
      <div class="danger-actions">
        <button class="btn-ghost" @click="logout">Log out</button>
        <button class="btn-ghost d-cancel" @click="cancelDeletion">Cancel deletion</button>
        <button class="btn-danger" @click="showDelete = true">Delete account</button>
      </div>
    </div>

    <div v-if="showDelete" class="overlay" @click="showDelete = false">
      <div class="modal card card-pad" @click.stop>
        <div class="modal-ic">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 2 20h20L12 3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /><path d="M12 10v4M12 17h0" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" /></svg>
        </div>
        <h2 class="modal-title">Delete your account?</h2>
        <p class="modal-text">
          Your account will be marked for deletion and disabled during the grace
          period. Your posts and messages will be anonymized. This action can be
          cancelled before the deadline.
        </p>
        <div class="modal-actions">
          <button class="btn-ghost grow" @click="showDelete = false">Cancel</button>
          <button class="btn-danger grow" @click="confirmDeletion">Confirm</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile {
  max-width: 560px;
}
.title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
  color: var(--color-text);
}
.sub {
  margin: 0 0 24px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--color-muted);
}
.card {
  margin-bottom: 18px;
}
.ident {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}
.av {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-lg);
  font-size: 20px;
  color: var(--color-text);
}
.ident-info {
  min-width: 0;
}
.ident-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}
.ident-mail {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-muted);
}
.row {
  display: flex;
  gap: 10px;
}
.row .input {
  flex: 1;
}
.ok {
  color: var(--color-success);
  font-family: var(--font-mono);
  font-size: 12px;
  margin: 12px 0 0;
}
.form-error {
  margin: 12px 0 0;
}
.danger {
  border-color: var(--color-border);
}
.danger-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--color-danger);
}
.danger-lab {
  color: var(--color-danger);
}
.danger-text {
  font-size: 13px;
  color: var(--color-text-dim);
  line-height: 1.6;
  margin: 0 0 18px;
}
.danger-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.d-cancel {
  color: var(--color-success);
}
.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0 16px;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius);
  background: transparent;
  color: var(--color-danger);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s, color 0.14s;
}
.btn-danger:hover {
  background: var(--color-danger);
  color: var(--color-bg);
}
.overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(4, 4, 6, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal {
  width: min(420px, 100%);
  margin: 0;
}
.modal-ic {
  width: 44px;
  height: 44px;
  border-radius: var(--radius);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  color: var(--color-danger);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 8px;
}
.modal-text {
  font-size: 13.5px;
  color: var(--color-text-dim);
  line-height: 1.6;
  margin: 0 0 22px;
}
.modal-actions {
  display: flex;
  gap: 10px;
}
.grow {
  flex: 1;
}
</style>
