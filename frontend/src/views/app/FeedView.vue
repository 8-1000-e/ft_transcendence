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
    <h1 class="title">Your projects</h1>
    <p class="sub">// jump into a project's discussions and teams.</p>

    <p v-if="groups.loading" class="muted rail-msg">Loading…</p>
    <p v-else-if="!groups.projects().length" class="muted rail-msg">
      No projects yet — you're not part of any 42 group.
    </p>

    <div class="grid">
      <RouterLink
        v-for="p in groups.projects()"
        :key="p.projectId"
        :to="{ name: 'project', params: { projectId: p.projectId } }"
        class="card proj-card"
      >
        <div class="card-top">
          <span class="card-code">{{ code(p.projectName) }}</span>
          <span class="badge">42</span>
        </div>
        <div class="card-name">{{ p.projectName }}</div>
        <div class="card-desc">Discussions and team suggestions.</div>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--color-text);
}
.sub {
  margin: 8px 0 26px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--color-muted);
}
.rail-msg {
  font-size: 13px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.proj-card {
  display: block;
  text-align: left;
  padding: 20px;
  text-decoration: none;
  transition: border-color 0.14s;
}
.proj-card:hover {
  border-color: var(--color-border-strong);
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.card-code {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-accent);
}
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}
.card-desc {
  font-size: 12.5px;
  color: var(--color-muted);
  line-height: 1.5;
}
</style>
