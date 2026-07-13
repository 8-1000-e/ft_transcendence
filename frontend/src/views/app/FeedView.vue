<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useGroupsStore } from '@/stores/groups'

const groups = useGroupsStore()

onMounted(() => {
  if (!groups.loaded) groups.fetchGroups()
})

function code(name?: string | null): string {
  return (name ?? '??').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()
}
</script>

<template>
  <section>
    <h1 class="title">Choisis un projet</h1>
    <p class="sub">// parie sur les rendus, suis les prédictions du campus.</p>

    <p v-if="groups.loading" class="muted">Chargement…</p>
    <p v-else-if="!groups.projects().length" class="muted">
      Aucun projet — tu n'es membre d'aucun groupe 42.
    </p>

    <div class="grid">
      <RouterLink
        v-for="p in groups.projects()"
        :key="p.projectId"
        :to="{ name: 'project', params: { projectId: p.projectId } }"
        class="card"
      >
        <div class="card-top">
          <span class="card-code">{{ code(p.projectName) }}</span>
          <span class="card-tag">42</span>
        </div>
        <div class="card-name">{{ p.projectName }}</div>
        <div class="card-desc">Fil de discussion et prédictions du projet.</div>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  color: #f6f6f7;
}
.sub {
  margin: 8px 0 24px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  color: #74747e;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.card {
  display: block;
  text-align: left;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(17, 17, 21, 0.72);
  text-decoration: none;
  transition: transform 0.14s, border-color 0.14s;
}
.card:hover {
  transform: translateY(-2px);
  border-color: rgba(110, 123, 242, 0.45);
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.card-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  color: #dfe2ff;
}
.card-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: #74747e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3px 7px;
  border-radius: 999px;
}
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: #ededee;
  margin-bottom: 6px;
}
.card-desc {
  font-size: 12.5px;
  color: #74747e;
  line-height: 1.5;
}
.muted {
  color: #74747e;
}
</style>
