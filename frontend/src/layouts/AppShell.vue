<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGroupsStore } from '@/stores/groups'

const auth = useAuthStore()
const groups = useGroupsStore()
const router = useRouter()

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
  try {
    await auth.cancelDeletion()
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <div class="page">
    <header class="hd">
      <RouterLink :to="{ name: 'feed' }" class="brand">
        <span class="brand-mark">H</span>
        <span class="brand-word">Hub<span class="brand-accent">42</span></span>
      </RouterLink>

      <div class="search">
        <span class="search-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8" /><path d="m20 20-3.2-3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
        </span>
        <input class="search-in" placeholder="Search projects, students…" />
      </div>

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
          <span class="section-title">Group chats</span>
          <span class="rail-count">{{ groups.groups.length }}</span>
        </div>
        <p v-if="groups.loading" class="muted rail-msg">Loading…</p>
        <p v-else-if="groups.error" class="muted rail-msg">{{ groups.error }}</p>
        <p v-else-if="!groups.groups.length" class="muted rail-msg">No groups yet.</p>
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
        <div class="rail-head"><span class="section-title">Projects</span></div>
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

    <div v-if="auth.pendingDeletion" class="overlay">
      <div class="modal card">
        <h2 class="modal-title">Account scheduled for deletion</h2>
        <p class="modal-text">
          Your account is scheduled to be deleted. Cancel the request to keep
          using Hub42, or log out.
        </p>
        <div class="modal-actions">
          <button class="btn-ghost" @click="logout">Log out</button>
          <button class="btn" @click="cancelDeletion">Cancel deletion</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--color-bg);
}

.hd {
  position: sticky;
  top: 0;
  z-index: 40;
  height: 58px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--color-accent);
  color: #fff;
  font-weight: 800;
  font-size: 15px;
}
.brand-word {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
}
.brand-accent {
  color: var(--color-accent);
}
.search {
  flex: 1;
  max-width: 440px;
  margin: 0 auto;
  position: relative;
  display: flex;
  align-items: center;
}
.search-ic {
  position: absolute;
  left: 12px;
  color: var(--color-muted);
  display: inline-flex;
}
.search-in {
  width: 100%;
  height: 38px;
  padding: 0 14px 0 36px;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13.5px;
  outline: none;
  transition: border-color 0.15s;
}
.search-in::placeholder {
  color: var(--color-muted);
}
.search-in:focus {
  border-color: var(--color-accent);
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
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 4px 12px 4px 4px;
  text-decoration: none;
  transition: border-color 0.14s;
}
.pill:hover {
  border-color: var(--color-border-strong);
}
.pill-av {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-dim);
}
.pill-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}
.logout:hover {
  border-color: rgba(239, 109, 114, 0.5);
  color: var(--color-danger);
}

.grid {
  display: grid;
  grid-template-columns: 264px 1fr 284px;
  max-width: 1520px;
  margin: 0 auto;
  align-items: start;
}
.scroll {
  overflow-y: auto;
}
.rail {
  position: sticky;
  top: 58px;
  height: calc(100vh - 58px);
  padding: 20px 14px;
}
.rail-left {
  border-right: 1px solid var(--color-border);
}
.rail-right {
  border-left: 1px solid var(--color-border);
  padding: 20px 16px;
}
.rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 12px;
}
.rail-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-muted);
}
.rail-msg {
  padding: 0 6px;
  font-size: 13px;
}
.grp {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 10px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  margin-bottom: 4px;
  text-decoration: none;
  transition: background 0.14s;
}
.grp:hover {
  background: var(--color-surface);
}
.grp.router-link-active {
  background: var(--color-surface);
  border-color: var(--color-border);
}
.grp-av {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-dim);
}
.grp-main {
  flex: 1;
  min-width: 0;
}
.grp-name {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.grp-proj {
  display: block;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.main {
  min-height: calc(100vh - 58px);
  padding: 26px 30px 60px;
  min-width: 0;
}
.proj {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  text-decoration: none;
  transition: background 0.14s;
}
.proj:hover {
  background: var(--color-surface);
}
.proj.router-link-active {
  background: var(--color-surface);
  border-color: var(--color-border);
}
.proj-code {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-accent);
  width: 32px;
}
.proj-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  padding: 26px;
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
.modal-actions > * {
  flex: 1;
}

@media (max-width: 1180px) {
  .rail-right {
    display: none;
  }
  .grid {
    grid-template-columns: 264px 1fr;
  }
}
@media (max-width: 900px) {
  .rail-left {
    display: none;
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .search {
    display: none;
  }
}
</style>
