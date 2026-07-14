<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'
import Modal from '@/components/Modal.vue'
import Avatar from '@/components/Avatar.vue'
import type { Activity } from '@/types/api'

const auth = useAuthStore()
const router = useRouter()

const name = ref(auth.user?.name ?? '')
const message = ref('')
const error = ref('')
const showDelete = ref(false)
const deleting = ref(false)
const deleteError = ref('')

const activity = ref<Activity>({ posts: [], comments: [] })
const activityLoading = ref(false)
const tab = ref<'posts' | 'comments'>('posts')

function fmtDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const memberSince = computed(() => fmtDate(auth.user?.createdAt))
const karma = computed(() => auth.user?.karma ?? 0)

async function loadActivity() {
  activityLoading.value = true
  try {
    activity.value = await api.get<Activity>(ROUTES.users.activity)
  } catch {
    /* activity is non-critical — leave the empty state showing */
  } finally {
    activityLoading.value = false
  }
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
  // The API reports what actually happened ('Deletion cancelled' vs
  // 'No deletion scheduled') — surface its message rather than assuming.
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

onMounted(loadActivity)
</script>

<template>
  <section class="profile">
    <h1 class="title">My profile</h1>
    <p class="sub">// manage your ft_hub account.</p>

    <!-- ── Header card ─────────────────────────────────────────── -->
    <div class="head">
      <div class="head-glow"></div>
      <Avatar
        class="pp av"
        :user-id="auth.user?.id ?? ''"
        :name="auth.user?.name ?? ''"
        :size="72"
      />

      <div class="head-info">
        <div class="head-name-row">
          <span class="head-name">{{ auth.user?.name }}</span>
          <span v-if="auth.user?.has42" class="badge42" title="Verified 42 student">
            <span class="badge42-mark">42</span>verified
          </span>
        </div>
        <div class="head-meta">
          <span v-if="auth.user?.campus" class="chip">{{ auth.user.campus }}</span>
          <span v-if="memberSince" class="since">member since {{ memberSince }}</span>
        </div>
      </div>

      <div class="karma">
        <span class="karma-val"><span class="karma-caret">▲</span>{{ karma }}</span>
        <span class="karma-lab">karma</span>
      </div>
    </div>

    <!-- ── Activity ────────────────────────────────────────────── -->
    <div class="tabs">
      <button
        class="tab"
        :class="{ on: tab === 'posts' }"
        @click="tab = 'posts'"
      >
        Posts<span class="tab-n">{{ activity.posts.length }}</span>
      </button>
      <button
        class="tab"
        :class="{ on: tab === 'comments' }"
        @click="tab = 'comments'"
      >
        Comments<span class="tab-n">{{ activity.comments.length }}</span>
      </button>
    </div>

    <p v-if="activityLoading" class="muted">Loading activity…</p>

    <template v-else>
      <!-- Posts -->
      <div v-if="tab === 'posts'" class="feed">
        <RouterLink
          v-for="p in activity.posts"
          :key="p.id"
          :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId } }"
          class="item"
        >
          <span class="score" :class="{ neg: p.upvotes - p.downvotes < 0 }">
            <span class="score-caret">▲</span>{{ p.upvotes - p.downvotes }}
          </span>
          <span class="item-main">
            <span class="item-title">{{ p.title || p.content }}</span>
            <span v-if="p.title" class="item-sub">{{ p.content }}</span>
          </span>
          <span class="item-date">{{ fmtDate(p.postedAt) }}</span>
        </RouterLink>
        <p v-if="!activity.posts.length" class="empty">No posts yet.</p>
      </div>

      <!-- Comments -->
      <div v-else class="feed">
        <component
          :is="c.postId ? 'RouterLink' : 'div'"
          v-for="c in activity.comments"
          :key="c.id"
          :to="
            c.postId
              ? { name: 'post', params: { postId: c.postId }, query: { projectId: c.projectId ?? undefined } }
              : undefined
          "
          class="item"
          :class="{ 'item-static': !c.postId }"
        >
          <span class="score" :class="{ neg: c.upvotes - c.downvotes < 0 }">
            <span class="score-caret">▲</span>{{ c.upvotes - c.downvotes }}
          </span>
          <span class="item-main">
            <span class="item-title comment">{{ c.content }}</span>
          </span>
          <span class="item-date">{{ fmtDate(c.postedAt) }}</span>
        </component>
        <p v-if="!activity.comments.length" class="empty">No comments yet.</p>
      </div>
    </template>

    <!-- ── Settings ────────────────────────────────────────────── -->
    <div class="card">
      <label class="lab" for="display-name">DISPLAY NAME</label>
      <div class="row">
        <input id="display-name" v-model="name" class="input" placeholder="Name" />
        <button class="save" @click="saveName">Save</button>
      </div>
      <p class="mail">{{ auth.user?.email }}</p>
      <p v-if="message" class="ok">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <!-- ── Danger zone ─────────────────────────────────────────── -->
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
  max-width: 620px;
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

/* ── Header card ── */
.head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(17, 17, 21, 0.72);
  padding: 22px;
  margin-bottom: 18px;
  overflow: hidden;
}
.head-glow {
  position: absolute;
  inset: 0 0 auto 0;
  height: 90px;
  pointer-events: none;
  background: radial-gradient(60% 100% at 24% 0%, rgba(110, 123, 242, 0.22), transparent 72%);
}
.pp,
.av {
  position: relative;
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: 18px;
  box-shadow: 0 12px 30px -14px rgba(110, 123, 242, 0.7);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  object-fit: cover;
}
.av {
  background: linear-gradient(135deg, #5e6cf0, #8c97f7);
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}
.head-info {
  position: relative;
  flex: 1;
  min-width: 0;
}
.head-name-row {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}
.head-name {
  font-size: 20px;
  font-weight: 700;
  color: #f0f0f2;
  letter-spacing: -0.01em;
}
.badge42 {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #8c97f7;
  border: 1px solid rgba(110, 123, 242, 0.35);
  background: rgba(110, 123, 242, 0.1);
  padding: 3px 8px 3px 4px;
  border-radius: 999px;
}
.badge42-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 15px;
  border-radius: 4px;
  background: #f4f4f2;
  color: #111;
  font-size: 9.5px;
  font-weight: 700;
}
.head-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.chip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #b6b6be;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.035);
  padding: 3px 9px;
  border-radius: 999px;
}
.since {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: #74747e;
}
.karma {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 16px;
  border-radius: 13px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}
.karma-val {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 700;
  color: #f0f0f2;
  line-height: 1;
}
.karma-caret {
  font-size: 13px;
  color: #8c97f7;
}
.karma-lab {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #74747e;
}

/* ── Tabs ── */
.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  color: #9a9aa2;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s, background 0.14s;
}
.tab:hover {
  color: #ededee;
  border-color: rgba(255, 255, 255, 0.16);
}
.tab.on {
  color: #f0f0f2;
  border-color: rgba(110, 123, 242, 0.45);
  background: rgba(110, 123, 242, 0.1);
}
.tab-n {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #74747e;
}
.tab.on .tab-n {
  color: #8c97f7;
}

/* ── Activity feed ── */
.feed {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 26px;
}
.item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 16px;
  border-radius: 13px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.02);
  text-decoration: none;
  transition: background 0.14s, border-color 0.14s, transform 0.14s;
}
.item:not(.item-static):hover {
  background: rgba(255, 255, 255, 0.045);
  border-color: rgba(110, 123, 242, 0.3);
}
.item-static {
  cursor: default;
}
.score {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: 46px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #c7cbf5;
}
.score-caret {
  font-size: 10px;
  color: #8c97f7;
}
.score.neg {
  color: #ef9ea1;
}
.score.neg .score-caret {
  color: #ef6d72;
  transform: rotate(180deg);
}
.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.item-title {
  font-size: 14px;
  font-weight: 600;
  color: #ededee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-title.comment {
  font-weight: 500;
  color: #c2c2c8;
}
.item-sub {
  font-size: 12.5px;
  color: #74747e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-date {
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #5c5c66;
}
.empty {
  padding: 22px 16px;
  border-radius: 13px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  text-align: center;
  color: #74747e;
  font-size: 13.5px;
}
.muted {
  color: #74747e;
  font-size: 13px;
  margin: 0 0 26px;
}

/* ── Settings card ── */
.card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(17, 17, 21, 0.72);
  padding: 22px;
  margin-bottom: 18px;
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
.mail {
  margin: 12px 0 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #74747e;
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

/* ── Danger zone ── */
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

@media (max-width: 560px) {
  .head {
    flex-wrap: wrap;
  }
  .karma {
    flex-direction: row;
    gap: 8px;
    margin-left: auto;
  }
}
</style>
