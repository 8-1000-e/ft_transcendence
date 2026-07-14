<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'

type ProjectCategory = 'core' | 'specialization'

interface Project {
  id: string
  name: string
  postCount: number
  category: ProjectCategory
}

const route = useRoute()
const projects = ref<Project[]>([])
const loading = ref(true)
const error = ref('')
const query = ref((route.query.q as string) ?? '')
// Common core is shown by default; specializations (outer circle) are opt-in.
const showSpecializations = ref(false)

// Keep the local filter in sync with the top-bar search (?q=…).
watch(
  () => route.query.q,
  (q) => {
    query.value = (q as string) ?? ''
  },
)

const coreCount = computed(
  () => projects.value.filter((p) => p.category === 'core').length,
)
const specCount = computed(
  () => projects.value.filter((p) => p.category === 'specialization').length,
)

const filtered = computed<Project[]>(() => {
  const q = query.value.trim().toLowerCase()
  // Tabs are exclusive: Common core shows only core, Specializations only spec.
  const activeCat: ProjectCategory = showSpecializations.value ? 'specialization' : 'core'
  return projects.value
    .filter((p) => p.category === activeCat && (q ? p.name.toLowerCase().includes(q) : true))
    .sort((a, b) => b.postCount - a.postCount)
})

function code(name?: string | null): string {
  return (name ?? '??').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??'
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
    <h1 class="h1">{{ $t('browse.title') }}</h1>
    <p class="eyebrow">// {{ $t('browse.sub') }}</p>

    <div class="tabs">
      <button :class="{ on: !showSpecializations }" @click="showSpecializations = false">
        {{ $t('browse.tab.core') }} · {{ coreCount }}
      </button>
      <button :class="{ on: showSpecializations }" @click="showSpecializations = true">
        {{ $t('browse.tab.spec') }} · {{ specCount }}
      </button>
    </div>

    <p v-if="error" class="err" style="margin-bottom: 12px">{{ error }}</p>
    <p v-if="loading" class="muted">{{ $t('browse.loading') }}</p>

    <template v-else>
      <p v-if="!projects.length" class="muted">{{ $t('browse.none') }}</p>
      <p v-else-if="!filtered.length && query" class="muted">{{ $t('browse.noneMatch', { q: query }) }}</p>
      <p v-else-if="!filtered.length" class="muted">{{ $t('browse.noneCategory') }}</p>

      <div v-else class="pgrid">
        <RouterLink
          v-for="p in filtered"
          :key="p.id"
          :to="{ name: 'project', params: { projectId: p.id } }"
          class="pcardx"
        >
          <div class="pcardx-top">
            <span class="av av-b sq">{{ code(p.name) }}</span>
            <span class="pcardx-cat" :class="{ spec: p.category === 'specialization' }">
              {{ p.category === 'core' ? $t('browse.badge.core') : $t('browse.badge.spec') }}
            </span>
          </div>
          <h3 class="pcardx-name">{{ p.name }}</h3>
          <p class="pcardx-meta">
            {{ p.postCount }} {{ p.postCount === 1 ? $t('common.post') : $t('common.posts') }}
          </p>
        </RouterLink>
      </div>
    </template>
  </section>
</template>
