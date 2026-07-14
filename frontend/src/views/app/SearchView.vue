<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import Avatar from '@/components/Avatar.vue'
import type { SearchResults } from '@/types/api'

const route = useRoute()
const q = computed(() => (route.query.q as string) ?? '')
const results = ref<SearchResults>({ projects: [], posts: [], comments: [] })
const loading = ref(false)
const error = ref('')

type Tab = 'posts' | 'comments' | 'projects'
const tab = ref<Tab>('posts')

const TABS: { key: Tab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'comments', label: 'Comments' },
  { key: 'projects', label: 'Projects' },
]

function count(t: Tab): number {
  return results.value[t].length
}

async function run() {
  const term = q.value.trim()
  results.value = { projects: [], posts: [], comments: [] }
  error.value = ''
  if (term.length < 2) return
  loading.value = true
  try {
    results.value = await api.get<SearchResults>(ROUTES.search(term))
    tab.value =
      (['posts', 'comments', 'projects'] as Tab[]).find((t) => count(t) > 0) ?? 'posts'
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Search failed'
  } finally {
    loading.value = false
  }
}

function code(name?: string | null): string {
  return (name ?? '??').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??'
}
function score(v: { upvotes: number; downvotes: number }): number {
  return v.upvotes - v.downvotes
}

watch(q, run, { immediate: true })
</script>

<template>
  <section>
    <h1 class="h1">{{ $t('search.title') }}</h1>
    <p class="eyebrow">// {{ $t('search.sub', { q }) }}</p>

    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <p v-if="q.trim().length < 2" class="muted">{{ $t('search.hint') }}</p>
    <p v-else-if="loading" class="muted">{{ $t('search.searching') }}</p>

    <template v-else>
      <div class="tabs" role="tablist">
        <button
          v-for="t in TABS"
          :key="t.key"
          class="tab"
          :class="{ on: tab === t.key }"
          role="tab"
          :aria-selected="tab === t.key"
          @click="tab = t.key"
        >{{ $t('search.tab.' + t.key) }} <span class="tab-n">{{ count(t.key) }}</span></button>
      </div>

      <p v-if="!results.posts.length && !results.comments.length && !results.projects.length" class="muted">
        {{ $t('search.none') }}
      </p>

      <div v-show="tab === 'posts'" class="list">
        <p v-if="!results.posts.length" class="muted">{{ $t('search.none.posts') }}</p>
        <RouterLink
          v-for="p in results.posts"
          :key="p.id"
          :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId } }"
          class="card res"
        >
          <div class="res-head">
            <span class="av av-b sq" style="width: 20px; height: 20px; font-size: 9px">{{ code(p.user?.name) }}</span>
            <span class="res-by">{{ p.user?.name ?? 'anonymous' }}</span>
            <span class="res-sc">{{ $t('search.karmaComments', { k: score(p), c: p._count?.chats ?? 0 }) }}</span>
          </div>
          <h3 v-if="p.title" class="res-title">{{ p.title }}</h3>
          <p class="res-body">{{ p.content }}</p>
        </RouterLink>
      </div>

      <div v-show="tab === 'comments'" class="list">
        <p v-if="!results.comments.length" class="muted">{{ $t('search.none.comments') }}</p>
        <RouterLink
          v-for="c in results.comments"
          :key="c.id"
          :to="{ name: 'post', params: { postId: c.postId }, query: { projectId: c.projectId } }"
          class="card res"
        >
          <div class="res-head">
            <Avatar class="av av-d" :user-id="c.writer" :name="c.user?.name ?? '??'" :size="20" />
            <span class="res-by">{{ c.user?.name ?? 'anonymous' }}</span>
            <span class="res-sc">{{ $t('search.karma', { n: score(c) }) }}</span>
          </div>
          <p class="res-body">{{ c.content }}</p>
          <p class="res-ctx">{{ $t('search.in', { title: c.postTitle ?? $t('search.aDiscussion') }) }}</p>
        </RouterLink>
      </div>

      <div v-show="tab === 'projects'" class="list">
        <p v-if="!results.projects.length" class="muted">{{ $t('search.none.projects') }}</p>
        <RouterLink
          v-for="pr in results.projects"
          :key="pr.id"
          :to="{ name: 'project', params: { projectId: pr.id } }"
          class="card res res-proj"
        >
          <span class="av av-b sq">{{ code(pr.name) }}</span>
          <div class="res-proj-main">
            <span class="res-title">{{ pr.name }}</span>
            <span class="res-ctx">{{ pr.postCount }} {{ pr.postCount === 1 ? $t('common.post') : $t('common.posts') }}<template v-if="pr.category"> · {{ pr.category }}</template></span>
          </div>
        </RouterLink>
      </div>
    </template>
  </section>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  margin: 8px 0 16px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}
.tab {
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  padding: 6px 12px;
  border-radius: 8px;
}
.tab:hover { color: var(--text-2); background: var(--surface-2); }
.tab.on { color: var(--accent-2); background: var(--surface-2); }
.tab-n { opacity: 0.7; }
.list { display: flex; flex-direction: column; gap: 10px; }
.res { display: block; text-decoration: none; }
.res-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.res-by { font-size: 12.5px; font-weight: 600; color: var(--text-2); }
.res-sc { margin-left: auto; font-family: var(--mono); font-size: 11px; color: var(--muted); }
.res-title { margin: 0 0 4px; font-size: 15px; font-weight: 700; color: var(--text); }
.res:hover .res-title { color: var(--accent-2); }
.res-body {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.res-ctx {
  margin: 6px 0 0;
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--dim);
}
.res-proj { display: flex; align-items: center; gap: 12px; }
.res-proj-main { display: flex; flex-direction: column; }
</style>
