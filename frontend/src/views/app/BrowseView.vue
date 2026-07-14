<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'

interface Project {
  id: string
  name: string
  postCount: number
}

const projects = ref<Project[]>([])
const loading = ref(true)
const error = ref('')
const query = ref('')

const filtered = computed<Project[]>(() => {
  const q = query.value.trim().toLowerCase()
  const list = q
    ? projects.value.filter((p) => p.name.toLowerCase().includes(q))
    : projects.value.slice()
  return list.sort((a, b) => b.postCount - a.postCount)
})

function code(name?: string | null): string {
  return (name ?? '??').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || '??'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    projects.value = await api.get<Project[]>(ROUTES.projects)
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed to load projects'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section>
    <h1 class="title">Browse projects</h1>
    <p class="sub">// every 42 project forum on ft_hub · {{ projects.length }} in total</p>

    <div class="search">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8" /><path d="m20 20-3.2-3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
      <input
        v-model="query"
        type="search"
        class="search-input"
        placeholder="Search projects…"
        aria-label="Search projects"
      />
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <p v-if="loading" class="muted">Loading projects…</p>

    <template v-else>
      <p v-if="!projects.length" class="muted">No projects available yet.</p>
      <p v-else-if="!filtered.length" class="muted">
        No projects match "{{ query }}".
      </p>

      <div v-else class="grid">
        <RouterLink
          v-for="p in filtered"
          :key="p.id"
          :to="{ name: 'project', params: { projectId: p.id } }"
          class="card"
        >
          <div class="card-top">
            <span class="card-code">{{ code(p.name) }}</span>
            <span class="card-count">
              {{ p.postCount }} {{ p.postCount === 1 ? 'post' : 'posts' }}
            </span>
          </div>
          <div class="card-name">{{ p.name }}</div>
          <div class="card-desc">Project discussion feed — posts, comments and votes.</div>
        </RouterLink>
      </div>
    </template>
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
  margin: 8px 0 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  color: #74747e;
}
.search {
  position: relative;
  margin-bottom: 24px;
  max-width: 420px;
}
.search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  color: #74747e;
  pointer-events: none;
}
.search-input {
  width: 100%;
  height: 44px;
  padding: 0 14px 0 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(17, 17, 21, 0.72);
  color: #f3f3f4;
  font: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.14s, box-shadow 0.14s;
}
.search-input::placeholder {
  color: #74747e;
}
.search-input:focus {
  border-color: #6e7bf2;
  box-shadow: 0 0 0 3px rgba(110, 123, 242, 0.2);
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
  gap: 10px;
  margin-bottom: 14px;
}
.card-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  color: #dfe2ff;
}
.card-count {
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: #74747e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3px 8px;
  border-radius: 999px;
}
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: #ededee;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-desc {
  font-size: 12.5px;
  color: #74747e;
  line-height: 1.5;
}
.muted {
  color: #74747e;
}
.error {
  color: #ef6d72;
  margin-bottom: 12px;
}
</style>
