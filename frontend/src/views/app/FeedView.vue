<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useGroupsStore } from '@/stores/groups'

const groups = useGroupsStore()

onMounted(() => {
  if (!groups.loaded) groups.fetchGroups()
})
</script>

<template>
  <section>
    <h1 class="title">Feed</h1>
    <p class="muted">
      Choisis un projet pour voir ses posts, ou un groupe pour le chat.
    </p>

    <h2 class="subtitle">Projets</h2>
    <p v-if="groups.loading" class="muted">Chargement…</p>
    <p v-else-if="!groups.projects().length" class="muted">
      Aucun projet (tu n'es membre d'aucun groupe 42).
    </p>
    <ul v-else class="list">
      <li v-for="p in groups.projects()" :key="p.projectId">
        <RouterLink
          :to="{ name: 'project', params: { projectId: p.projectId } }"
          class="card-link"
        >
          {{ p.projectName }}
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.title {
  font-size: 22px;
  margin: 0 0 4px;
}
.subtitle {
  font-size: 15px;
  margin: 24px 0 10px;
  color: #d6d6da;
}
.muted {
  color: var(--color-muted);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card-link {
  display: block;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: #ededee;
  text-decoration: none;
}
.card-link:hover {
  border-color: var(--color-accent);
}
</style>
