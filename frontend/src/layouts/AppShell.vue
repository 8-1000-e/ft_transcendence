<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGroupsStore } from '@/stores/groups'
import Modal from '@/components/Modal.vue'

const auth = useAuthStore()
const groups = useGroupsStore()
const router = useRouter()

const cancelError = ref('')

onMounted(() => {
  if (!groups.loaded) groups.fetchGroups()
})

function initials(name?: string | null): string {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '')
  return (a + b).toUpperCase()
}

function code(name?: string | null): string {
  return (name ?? '??').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()
}

async function logout() {
  await auth.logout()
  await router.push('/login')
}

async function cancelDeletion() {
  cancelError.value = ''
  try {
    await auth.cancelDeletion()
  } catch (e) {
    cancelError.value = (e as { message?: string }).message ?? 'Failed to cancel deletion'
  }
}
</script>

<template>
  <div class="page">
    <div class="bg-dots"></div>
    <div class="bg-glow"></div>

    <header class="hd">
      <RouterLink :to="{ name: 'feed' }" class="brand">
        <span class="brand-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 16.5 L9 10.5 L13 14.5 L21 6.5" stroke="#8C97F7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M15.5 6.5 H21 V12" stroke="#8C97F7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="brand-word">ft<span class="brand-accent">_hub</span></span>
      </RouterLink>

      <div class="hd-right">
        <RouterLink :to="{ name: 'me' }" class="pill">
          <span class="pill-av">{{ initials(auth.user?.name) }}</span>
          <span class="pill-name">{{ auth.user?.name ?? 'Profile' }}</span>
        </RouterLink>
        <button class="icon-btn logout" aria-label="Log out" @click="logout">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /><path d="M10 8l-4 4 4 4M6 12h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </header>

    <div class="grid">
      <aside class="rail rail-left scroll">
        <div class="rail-head">
          <span class="rail-title">YOUR GROUPCHAT</span>
          <span class="rail-count">{{ groups.groups.length }}</span>
        </div>
        <p v-if="groups.loading" class="muted">Loading…</p>
        <p v-else-if="groups.error" class="muted">{{ groups.error }}</p>
        <p v-else-if="!groups.groups.length" class="muted">No groups yet.</p>
        <RouterLink
          v-for="g in groups.groups"
          :key="g.id"
          :to="{ name: 'group', params: { groupId: g.id } }"
          class="grp"
        >
          <span class="grp-av">{{ initials(g.groupName) }}</span>
          <span class="grp-main">
            <span class="grp-name">{{ g.groupName }}</span>
            <span class="grp-proj">{{ g.projectName }}</span>
          </span>
        </RouterLink>
      </aside>

      <main class="main scroll">
        <RouterView />
      </main>

      <aside class="rail rail-right scroll">
        <div class="rail-head"><span class="rail-title">PROJECTS</span></div>
        <RouterLink
          v-for="p in groups.projects()"
          :key="p.projectId"
          :to="{ name: 'project', params: { projectId: p.projectId } }"
          class="proj"
        >
          <span class="proj-code">{{ code(p.projectName) }}</span>
          <span class="proj-name">{{ p.projectName }}</span>
        </RouterLink>
      </aside>
    </div>

    <!-- Blocking barrier: backdrop-close disabled so it can't be dismissed
         without either cancelling the request or logging out. -->
    <Modal
      :open="auth.pendingDeletion"
      title="Account scheduled for deletion"
      :backdrop-close="false"
    >
      <p class="modal-text">
        Your account is scheduled for deletion. Cancel the request to keep
        using it, or log out.
      </p>
      <p v-if="cancelError" class="modal-err" role="alert">{{ cancelError }}</p>
      <template #actions>
        <button class="btn-ghost" @click="logout">Log out</button>
        <button class="btn-primary" @click="cancelDeletion">Cancel deletion</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  min-height: 100vh;
  background: #08080a;
  overflow: hidden;
}
.bg-dots {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.6;
  background-image: radial-gradient(rgba(255, 255, 255, 0.028) 1px, transparent 1.4px);
  background-size: 30px 30px;
}
.bg-glow {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(70% 55% at 50% 0%, rgba(94, 108, 232, 0.1) 0%, transparent 60%);
}

.hd {
  position: sticky;
  top: 0;
  z-index: 40;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 20px;
  border-bottom: 1px solid #1c1c22;
  background: rgba(10, 10, 12, 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
}
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(110, 123, 242, 0.14);
  border: 1px solid rgba(110, 123, 242, 0.32);
}
.brand-word {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #f4f4f2;
}
.brand-accent {
  color: #8c97f7;
}
.hd-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.pill {
  display: flex;
  align-items: center;
  gap: 9px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 4px 12px 4px 4px;
  text-decoration: none;
}
.pill:hover {
  border-color: rgba(255, 255, 255, 0.2);
}
.pill-av {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5e6cf0, #8c97f7);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}
.pill-name {
  font-size: 13px;
  font-weight: 600;
  color: #ededee;
}
.icon-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #9a9aa2;
  cursor: pointer;
}
.logout:hover {
  border-color: rgba(239, 109, 114, 0.4);
  color: #ef6d72;
}

.grid {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: 268px 1fr 288px;
  max-width: 1560px;
  margin: 0 auto;
  align-items: start;
}
.scroll {
  overflow-y: auto;
}
.rail {
  position: sticky;
  top: 60px;
  height: calc(100vh - 60px);
  padding: 20px 14px;
}
.rail-left {
  border-right: 1px solid #1c1c22;
}
.rail-right {
  border-left: 1px solid #1c1c22;
  padding: 20px 16px;
}
.rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 12px;
}
.rail-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: #74747e;
}
.rail-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #5c5c66;
}
.grp {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px;
  border-radius: 11px;
  border: 1px solid transparent;
  margin-bottom: 6px;
  text-decoration: none;
  transition: background 0.14s, border-color 0.14s;
}
.grp:hover {
  background: rgba(255, 255, 255, 0.045);
  border-color: rgba(255, 255, 255, 0.1);
}
.grp-av {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2a2a40, #3d3d5c);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #dfe2ff;
}
.grp-main {
  flex: 1;
  min-width: 0;
}
.grp-name {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: #ededee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.grp-proj {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: #74747e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.main {
  min-height: calc(100vh - 60px);
  padding: 26px 30px 60px;
  min-width: 0;
}
.proj {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  text-decoration: none;
}
.proj:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}
.proj-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #8c97f7;
  width: 34px;
}
.proj-name {
  flex: 1;
  font-size: 13px;
  color: #cfcfd4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.muted {
  color: #74747e;
  font-size: 13px;
  padding: 0 6px;
}

.modal-text {
  margin: 0;
}
.modal-err {
  margin: 12px 0 0;
  color: #ef6d72;
  font-size: 13px;
  line-height: 1.5;
}
.btn-ghost {
  flex: 1;
  height: 44px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  color: #d6d6da;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary {
  flex: 1;
  height: 44px;
  border-radius: 11px;
  border: none;
  background: linear-gradient(180deg, #5e6cf0, #4a5fe8);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 1180px) {
  .rail-right {
    display: none;
  }
  .grid {
    grid-template-columns: 268px 1fr;
  }
}
@media (max-width: 900px) {
  .rail-left {
    display: none;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
