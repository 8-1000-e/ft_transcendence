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

async function logout() {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="shell">
    <header class="shell-header">
      <RouterLink :to="{ name: 'feed' }" class="brand">
        ft<span class="brand-accent">_predict</span>
      </RouterLink>
      <input class="search" type="search" placeholder="Rechercher…" disabled />
      <nav class="header-nav">
        <RouterLink :to="{ name: 'me' }">{{ auth.user?.name ?? 'Profil' }}</RouterLink>
        <button class="link-btn" @click="logout">Déconnexion</button>
      </nav>
    </header>

    <div class="shell-body">
      <aside class="sidebar-left">
        <p class="sidebar-title">YOUR GROUPCHAT</p>
        <p v-if="groups.loading" class="muted">Chargement…</p>
        <p v-else-if="groups.error" class="muted">{{ groups.error }}</p>
        <p v-else-if="!groups.groups.length" class="muted">Aucun groupe.</p>
        <ul v-else class="group-list">
          <li v-for="g in groups.groups" :key="g.id">
            <RouterLink :to="{ name: 'group', params: { groupId: g.id } }" class="group-item">
              {{ g.groupName }}
              <span class="group-project">{{ g.projectName }}</span>
            </RouterLink>
          </li>
        </ul>
      </aside>

      <main class="shell-main">
        <RouterView />
      </main>

      <aside class="sidebar-right">
        <p class="sidebar-title">PROJETS</p>
        <ul class="group-list">
          <li v-for="p in groups.projects()" :key="p.projectId">
            <RouterLink :to="{ name: 'project', params: { projectId: p.projectId } }" class="group-item">
              {{ p.projectName }}
            </RouterLink>
          </li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.shell-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border);
}
.brand {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 18px;
  text-decoration: none;
  color: #f3f3f4;
}
.brand-accent {
  color: var(--color-accent);
}
.search {
  flex: 1;
  max-width: 520px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: #f3f3f4;
  padding: 0 12px;
}
.header-nav {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-nav a {
  color: #c8c8cf;
  text-decoration: none;
}
.link-btn {
  background: none;
  border: 1px solid var(--color-border);
  color: #c8c8cf;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}
.shell-body {
  flex: 1;
  display: grid;
  grid-template-columns: 240px 1fr 240px;
  gap: 0;
}
.sidebar-left,
.sidebar-right {
  padding: 16px;
  border-right: 1px solid var(--color-border);
}
.sidebar-right {
  border-right: none;
  border-left: 1px solid var(--color-border);
}
.shell-main {
  padding: 20px;
  min-width: 0;
}
.sidebar-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--color-accent);
  margin: 0 0 12px;
}
.group-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.group-item {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  border-radius: 8px;
  text-decoration: none;
  color: #e3e3e6;
  border: 1px solid transparent;
}
.group-item:hover {
  background: var(--color-surface-2);
  border-color: var(--color-border);
}
.group-project {
  font-size: 11px;
  color: var(--color-muted);
}
.muted {
  color: var(--color-muted);
  font-size: 13px;
}
</style>
