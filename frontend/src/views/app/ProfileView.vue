<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'
import Modal from '@/components/Modal.vue'

const auth = useAuthStore()
const router = useRouter()

const name = ref(auth.user?.name ?? '')
const message = ref('')
const error = ref('')
const showDelete = ref(false)
const deleting = ref(false)
const deleteError = ref('')

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

function openDelete() {
  // Clear stale success/error banners so nothing lingers behind the modal.
  message.value = ''
  error.value = ''
  deleteError.value = ''
  showDelete.value = true
}

function onDeleteClose() {
  // Backdrop click / Escape / Cancel: dismiss, but never mid-request.
  if (deleting.value) return
  showDelete.value = false
}

async function confirmDeletion() {
  // Keep the modal open with a loading state until the request resolves;
  // surface failures inside the modal and close only on success.
  deleteError.value = ''
  deleting.value = true
  try {
    const res = await api.del<{ message: string }>(ROUTES.users.deleteMe)
    message.value = res?.message ?? 'Deletion scheduled.'
    showDelete.value = false
  } catch (e) {
    deleteError.value = (e as { message?: string }).message ?? 'Failed'
  } finally {
    deleting.value = false
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
    <p class="sub">// manage your ft_hub account.</p>

    <div class="card">
      <div class="ident">
        <span class="av">{{ initials(auth.user?.name) }}</span>
        <div>
          <div class="ident-name">{{ auth.user?.name }}</div>
          <div class="ident-mail">
            {{ auth.user?.email }}
            <span v-if="auth.user?.createdAt"> · since {{ auth.user.createdAt.slice(0, 10) }}</span>
          </div>
        </div>
      </div>

      <label class="lab">DISPLAY NAME</label>
      <div class="row">
        <input v-model="name" class="input" placeholder="Name" />
        <button class="save" @click="saveName">Save</button>
      </div>
      <p v-if="message" class="ok">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div class="danger">
      <div class="danger-head">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3 2 20h20L12 3z" stroke="#ef6d72" stroke-width="1.7" stroke-linejoin="round" /><path d="M12 10v4M12 17h0" stroke="#ef6d72" stroke-width="1.9" stroke-linecap="round" /></svg>
        <span class="danger-lab">DANGER ZONE</span>
      </div>
      <p class="danger-text">
        Account deletion takes effect after a grace period (14 days).
        You can cancel while the grace period is running; your content is anonymized.
      </p>
      <div class="danger-actions">
        <button class="d-ghost" @click="logout">Log out</button>
        <button class="d-cancel" @click="cancelDeletion">Cancel deletion</button>
        <button class="d-delete" @click="openDelete">Delete account</button>
      </div>
    </div>

    <Modal :open="showDelete" title="Delete your account?" @close="onDeleteClose">
      <p class="modal-text">
        Your account will be marked for deletion and disabled during the grace
        period. Your posts and messages will be anonymized. This action can be
        cancelled before the deadline.
      </p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <template #actions>
        <button class="d-ghost grow" :disabled="deleting" @click="onDeleteClose">Cancel</button>
        <button class="d-delete grow" :disabled="deleting" @click="confirmDeletion">
          {{ deleting ? 'Deleting…' : 'Confirm' }}
        </button>
      </template>
    </Modal>
  </section>
</template>

<style scoped>
.profile {
  max-width: 560px;
}
.title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
  color: #f6f6f7;
}
.sub {
  margin: 0 0 24px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  color: #74747e;
}
.card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(17, 17, 21, 0.72);
  padding: 22px;
  margin-bottom: 18px;
}
.ident {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}
.av {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #5e6cf0, #8c97f7);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}
.ident-name {
  font-size: 19px;
  font-weight: 700;
  color: #f0f0f2;
}
.ident-mail {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #74747e;
}
.lab {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: #74747e;
  margin-bottom: 7px;
}
.row {
  display: flex;
  gap: 10px;
}
.input {
  flex: 1;
  height: 46px;
  padding: 0 14px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.035);
  color: #f3f3f4;
  font: inherit;
  font-size: 14.5px;
  outline: none;
}
.input:focus {
  border-color: #6e7bf2;
  box-shadow: 0 0 0 3px rgba(110, 123, 242, 0.2);
}
.save {
  height: 46px;
  padding: 0 18px;
  border-radius: 11px;
  border: none;
  background: linear-gradient(180deg, #5e6cf0, #4a5fe8);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.save:hover {
  filter: brightness(1.08);
}
.ok {
  color: #5ee08a;
  font-size: 13px;
  margin: 12px 0 0;
}
.error {
  color: #ef6d72;
  font-size: 13px;
  margin: 12px 0 0;
}
.danger {
  border-radius: 16px;
  border: 1px solid rgba(239, 109, 114, 0.25);
  background: rgba(239, 109, 114, 0.05);
  padding: 20px;
}
.danger-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.danger-lab {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: #ef6d72;
}
.danger-text {
  font-size: 13px;
  color: #9a9aa2;
  line-height: 1.55;
  margin: 0 0 16px;
}
.danger-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.d-ghost,
.d-cancel,
.d-delete {
  height: 42px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}
.d-ghost {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  color: #d6d6da;
}
.d-cancel {
  border: 1px solid rgba(94, 225, 138, 0.3);
  background: rgba(94, 225, 138, 0.06);
  color: #5ee08a;
}
.d-delete {
  border: none;
  background: #ef6d72;
  color: #1a0708;
  font-weight: 700;
}
.d-ghost:disabled,
.d-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.modal-text {
  margin: 0;
}
.grow {
  flex: 1;
  height: 44px;
}
</style>
