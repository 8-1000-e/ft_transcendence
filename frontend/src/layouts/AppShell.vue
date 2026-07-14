<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink, RouterView } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'
import { useGroupsStore } from '@/stores/groups'
import Modal from '@/components/Modal.vue'
import Avatar from '@/components/Avatar.vue'
import type { NotificationItem, NotificationsPage } from '@/types/api'

const auth = useAuthStore()
const groups = useGroupsStore()
const route = useRoute()
const router = useRouter()

const showMenu = ref(false)
const search = ref('')
const cancelError = ref('')
// Mobile: the left rail (nav + group chats) is a slide-in drawer below 900px.
const drawerOpen = ref(false)
watch(() => route.fullPath, () => (drawerOpen.value = false))

// Only leaf routes declare a named `rail` view; without it the grid collapses to two columns.
const hasRail = computed(() =>
  route.matched.some((r) => r.components && 'rail' in r.components),
)

const requestCount = ref(0)
let heartbeat: ReturnType<typeof setInterval> | null = null

async function refreshRequests() {
  if (!auth.user?.has42) return
  try {
    const reqs = await api.get<unknown[]>(ROUTES.friends.requests)
    requestCount.value = reqs.length
  } catch {
    /* ignore */
  }
}

const notifs = ref<NotificationItem[]>([])
const unread = ref(0)
const showNotifs = ref(false)

async function refreshNotifs() {
  if (!auth.user?.has42) return
  try {
    const r = await api.get<NotificationsPage>(ROUTES.notifications.list)
    notifs.value = r.items
    unread.value = r.unread
  } catch {
    /* ignore */
  }
}

async function openNotifs() {
  showNotifs.value = !showNotifs.value
  if (showNotifs.value && unread.value) {
    unread.value = 0
    notifs.value = notifs.value.map((n) => ({ ...n, read: true }))
    try {
      await api.post(ROUTES.notifications.read)
    } catch {
      /* ignore */
    }
  }
}

function openNotif(n: NotificationItem) {
  showNotifs.value = false
  if (n.link) void router.push(n.link)
}

function notifTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const h = Math.round(mins / 60)
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`
}

onMounted(() => {
  // Only 42-linked accounts have group chats (GET /groups returns [] otherwise).
  if (auth.user?.has42 && !groups.loaded) groups.fetchGroups()
  // 42 accounts: online heartbeat (2-min window → 60s beat) plus polling requests/notifications for the badges.
  if (auth.user?.has42) {
    void auth.ping()
    void refreshRequests()
    void refreshNotifs()
    heartbeat = setInterval(() => {
      void auth.ping()
      void refreshRequests()
      void refreshNotifs()
    }, 60_000)
  }
})
onUnmounted(() => {
  if (heartbeat) clearInterval(heartbeat)
})

function initials(name?: string | null): string {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '')
  return (a + b).toUpperCase() || '??'
}

function submitSearch() {
  const q = search.value.trim()
  if (!q) return
  router.push({ name: 'search', query: { q } })
}

async function logout() {
  showMenu.value = false
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
  <div class="hub">
    <div class="hub-bg-dots"></div>
    <div class="hub-bg-glow"></div>

    <header class="topbar">
      <button class="hamburger" aria-label="Open menu" @click="drawerOpen = true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" /></svg>
      </button>
      <RouterLink :to="{ name: 'feed' }" class="brand">
        <span class="brand-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 16.5 L9 10.5 L13 14.5 L21 6.5" stroke="#8C97F7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M15.5 6.5 H21 V12" stroke="#8C97F7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="brand-word">ft<span class="brand-accent">_hub</span></span>
      </RouterLink>

      <form class="search" @submit.prevent="submitSearch">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8" /><path d="m20 20-3.2-3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
        <input v-model="search" :placeholder="$t('shell.search.placeholder')" :aria-label="$t('shell.search.placeholder')" />
        <kbd>/</kbd>
      </form>

      <div class="topbar-right">
        <div v-if="auth.user?.has42" class="notif-wrap">
          <button class="notif-btn" :aria-label="$t('notif.title')" @click="openNotifs">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10.5 20a2 2 0 0 0 3 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <span v-if="unread" class="notif-badge">{{ unread }}</span>
          </button>
          <template v-if="showNotifs">
            <button class="menu-backdrop" :aria-label="$t('notif.title')" @click="showNotifs = false"></button>
            <div class="notif-panel" role="menu">
              <div class="notif-head">{{ $t('notif.title') }}</div>
              <p v-if="!notifs.length" class="notif-empty">{{ $t('notif.empty') }}</p>
              <button
                v-for="n in notifs"
                :key="n.id"
                class="notif-item"
                :class="{ unread: !n.read }"
                role="menuitem"
                @click="openNotif(n)"
              >
                <span class="notif-text"><b>{{ n.actorName ?? '—' }}</b> {{ $t('notif.type.' + n.type) }}</span>
                <span v-if="n.entityLabel" class="notif-sub">{{ n.entityLabel }}</span>
                <span class="notif-time">{{ notifTime(n.createdAt) }}</span>
              </button>
            </div>
          </template>
        </div>
        <div class="pill-wrap">
          <button class="pill" aria-haspopup="menu" :aria-expanded="showMenu" @click="showMenu = !showMenu">
            <Avatar
              class="av av-a"
              :user-id="auth.user?.id ?? ''"
              :name="auth.user?.name ?? ''"
              :size="28"
              style="font-size: 11px"
            />
            <span class="pill-name">{{ auth.user?.name ?? 'Account' }}</span>
            <svg class="pill-caret" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>

          <template v-if="showMenu">
            <button
              class="menu-backdrop"
              aria-label="Close menu"
              @click="showMenu = false"
            ></button>
            <div class="menu" role="menu">
              <RouterLink :to="{ name: 'me' }" role="menuitem" @click="showMenu = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.5" stroke="currentColor" stroke-width="1.7" /><path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" /></svg>
                {{ $t('shell.menu.profile') }}
              </RouterLink>
              <RouterLink :to="{ name: 'settings' }" role="menuitem" @click="showMenu = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" /></svg>
                {{ $t('shell.menu.settings') }}
              </RouterLink>
              <div class="sep"></div>
              <button class="danger" role="menuitem" @click="logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /><path d="M10 8l-4 4 4 4M6 12h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
                {{ $t('shell.menu.logout') }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </header>

    <div class="app">
      <button v-if="drawerOpen" class="drawer-backdrop" aria-label="Close menu" @click="drawerOpen = false"></button>
      <div class="grid" :class="{ 'no-rail': !hasRail }">
        <aside class="rail rail-left" :class="{ 'drawer-open': drawerOpen }">
          <nav class="lnav">
            <RouterLink :to="{ name: 'feed' }">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
              {{ $t('shell.nav.home') }}
            </RouterLink>
            <RouterLink :to="{ name: 'browse' }">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7.5" stroke="currentColor" stroke-width="1.8" /><path d="m14 8-1.6 4.4L8 14l1.6-4.4L14 8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>
              {{ $t('shell.nav.explore') }}
            </RouterLink>
            <RouterLink v-if="auth.user?.has42" :to="{ name: 'friends' }">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>
              {{ $t('shell.nav.friends') }}
              <span v-if="requestCount" class="nav-badge">{{ requestCount }}</span>
            </RouterLink>
          </nav>

          <!-- 42 accounts: their project group chats -->
          <template v-if="auth.user?.has42">
            <div class="rail-head">
              <span class="rail-title">{{ $t('shell.groupchats') }}</span>
              <span class="rail-count">{{ groups.groups.length }}</span>
            </div>
            <p v-if="groups.loading || (groups.syncing && !groups.groups.length)" class="muted" style="padding: 0 8px">{{ $t('shell.groupchats.loading') }}</p>
            <p v-else-if="groups.error" class="muted" style="padding: 0 8px">{{ groups.error }}</p>
            <p v-else-if="!groups.groups.length" class="muted" style="padding: 0 8px">{{ $t('shell.groupchats.empty') }}</p>
            <RouterLink
              v-for="g in groups.groups"
              :key="g.id"
              :to="{ name: 'group', params: { groupId: g.id } }"
              class="grp"
            >
              <span class="av av-b sq">{{ initials(g.groupName) }}</span>
              <span class="grp-main">
                <span class="grp-name">{{ g.groupName }}</span>
                <span class="grp-proj">{{ g.projectName }}</span>
              </span>
            </RouterLink>
            <p v-if="groups.syncing && groups.groups.length" class="muted" style="padding: 4px 8px; font-size: 11px">{{ $t('shell.groupchats.syncing') }}</p>
          </template>

          <!-- non-42 accounts: Link-42 CTA in place of the group-chat list -->
          <div v-else class="link42">
            <span class="link42-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </span>
            <p class="link42-t">{{ $t('shell.link42.title') }}</p>
            <p class="link42-x">{{ $t('shell.link42.desc') }}</p>
            <button class="link42-btn" @click="auth.link42()"><span class="badge42-sq">42</span>{{ $t('common.linkYour42') }}</button>
          </div>
        </aside>

        <main class="main" :class="{ 'chat-main': route.name === 'group' }">
          <RouterView />
        </main>

        <aside v-if="hasRail" class="rail ctx-rail">
          <RouterView name="rail" />
        </aside>
      </div>
    </div>

    <footer class="hub-foot">
      <div class="foot-main">
        <div class="foot-brand">
          <span class="brand-mark">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 16.5 L9 10.5 L13 14.5 L21 6.5" stroke="#8C97F7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /><path d="M15.5 6.5 H21 V12" stroke="#8C97F7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
          <div>
            <div class="fbrand">ft<span>_hub</span></div>
            <div class="foot-tag">{{ $t('shell.foot.tag') }}</div>
          </div>
        </div>
        <nav class="foot-links">
          <RouterLink :to="{ name: 'feed' }">{{ $t('shell.nav.home') }}</RouterLink>
          <RouterLink :to="{ name: 'browse' }">{{ $t('shell.nav.explore') }}</RouterLink>
          <RouterLink :to="{ name: 'privacy' }">{{ $t('shell.nav.privacy') }}</RouterLink>
          <RouterLink :to="{ name: 'terms' }">{{ $t('shell.nav.terms') }}</RouterLink>
        </nav>
      </div>
      <div class="foot-bottom">
        <span>{{ $t('shell.foot.copy') }}</span>
        <span>{{ $t('shell.foot.disclaimer') }}</span>
      </div>
    </footer>

    <!-- Blocking barrier for accounts pending deletion. -->
    <Modal
      :open="auth.pendingDeletion"
      :title="$t('shell.pending.title')"
      :backdrop-close="false"
    >
      <p>{{ $t('shell.pending.body') }}</p>
      <p v-if="cancelError" class="err" role="alert">{{ cancelError }}</p>
      <template #actions>
        <button class="btn-ghost" style="flex: 1" @click="logout">{{ $t('shell.menu.logout') }}</button>
        <button class="btn-primary" style="flex: 1" @click="cancelDeletion">{{ $t('shell.pending.cancel') }}</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 65;
  background: none;
  border: none;
  cursor: default;
}
.nav-badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--accent-2);
  color: #0d0d12;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.notif-wrap { position: relative; }
.notif-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--border-soft);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-2);
  cursor: pointer;
}
.notif-btn:hover { color: var(--text); border-color: rgba(255, 255, 255, 0.18); }
.notif-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--accent-2);
  color: #0d0d12;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.notif-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 66;
  width: 320px;
  max-height: 420px;
  overflow-y: auto;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.6);
  padding: 6px;
}
.notif-head {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 8px 10px 6px;
}
.notif-empty { color: var(--muted); font-size: 13px; padding: 10px; margin: 0; }
.notif-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  padding: 9px 10px;
  border-radius: 8px;
}
.notif-item:hover { background: var(--surface-3); }
.notif-item.unread { background: rgba(140, 151, 247, 0.08); }
.notif-text { font-size: 13px; color: var(--text-2); }
.notif-text b { color: var(--text); font-weight: 600; }
.notif-sub {
  font-size: 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.notif-time { font-family: var(--mono); font-size: 10.5px; color: var(--dim); }
</style>
