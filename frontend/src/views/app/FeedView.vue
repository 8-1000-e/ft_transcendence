<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'
import { useGroupsStore } from '@/stores/groups'
import ImageCarousel from '@/components/ImageCarousel.vue'
import { publicUrl } from '@/api/upload'
import type { Page, Post, VoteValue } from '@/types/api'

const auth = useAuthStore()
const groups = useGroupsStore()

interface FeedPost extends Post {
  community: string
}
interface BrowseProject {
  id: string
  name: string
  postCount: number
  category: 'core' | 'specialization'
}

const rawPosts = ref<FeedPost[]>([])
const loading = ref(true)
const error = ref('')

type SortKey = 'hot' | 'new' | 'top' | 'discussed'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'hot', label: 'Hot' },
  { key: 'new', label: 'New' },
  { key: 'top', label: 'Top' },
  { key: 'discussed', label: 'Discussed' },
]
const sort = ref<SortKey>('hot')

// Client-side pagination over the sorted aggregate: 7 at a time + infinite scroll.
const PAGE = 7
const shown = ref(PAGE)

const has42 = computed(() => !!auth.user?.has42)

function score(p: Post): number {
  return p.upvotes - p.downvotes
}
function ageHours(iso: string): number {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 9999
  return Math.max(0, (Date.now() - t) / 3_600_000)
}
// Upvote-weighted with a gentle time decay so fresh, well-received posts rise.
function hotRank(p: FeedPost): number {
  return score(p) / Math.pow(ageHours(p.postedAt) + 2, 1.3)
}

// Feed is a bounded window of posts, so sorting stays client-side (no cursor to break); tabs re-rank the same set.
const items = computed<FeedPost[]>(() => {
  const list = rawPosts.value.slice()
  const recent = (a: FeedPost, b: FeedPost) => +new Date(b.postedAt) - +new Date(a.postedAt)
  if (sort.value === 'new') list.sort(recent)
  else if (sort.value === 'top') list.sort((a, b) => score(b) - score(a) || recent(a, b))
  else if (sort.value === 'discussed')
    list.sort((a, b) => (b._count?.chats ?? 0) - (a._count?.chats ?? 0) || recent(a, b))
  else list.sort((a, b) => hotRank(b) - hotRank(a) || recent(a, b))
  return list
})
const visible = computed(() => items.value.slice(0, shown.value))

// Reset to the first page when the sort changes so it starts from the top.
watch(sort, () => {
  shown.value = PAGE
})

function fmtTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

function code(name?: string | null): string {
  return (name ?? '??').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??'
}

const discover = ref(false)

async function memberProjects(): Promise<{ id: string; name: string }[]> {
  if (!has42.value) return []
  if (!groups.loaded) await groups.fetchGroups()
  return groups.projects().map((p) => ({ id: p.projectId, name: p.projectName }))
}

async function popularProjects(): Promise<{ id: string; name: string }[]> {
  const projects = await api.get<BrowseProject[]>(ROUTES.projects).catch(() => [])
  return projects
    .filter((p) => p.category === 'core' && p.postCount > 0)
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 6)
    .map((p) => ({ id: p.id, name: p.name }))
}

async function fetchFrom(src: { id: string; name: string }[]): Promise<FeedPost[]> {
  const lists = await Promise.all(
    src.slice(0, 6).map((s) =>
      api
        .get<Page<Post>>(`${ROUTES.posts.listByProject(s.id)}?limit=20`)
        .then((page) => page.items.map((p) => ({ ...p, community: s.name })))
        .catch(() => [] as FeedPost[]),
    ),
  )
  return lists.flat()
}

async function load() {
  loading.value = true
  error.value = ''
  discover.value = false
  try {
    let result = await fetchFrom(await memberProjects())
    // No dead-end for non-members: if the member feed is empty, fall back to what's active across the school.
    if (!result.length) {
      discover.value = true
      result = await fetchFrom(await popularProjects())
    }
    rawPosts.value = result
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed to load your feed'
  } finally {
    loading.value = false
  }
}

async function vote(post: FeedPost, value: VoteValue) {
  if (!has42.value) return
  try {
    await api.post(ROUTES.posts.vote(post.id), { vote: value })
    await load()
  } catch {
    /* ignore */
  }
}

onMounted(load)
</script>

<template>
  <section>
    <h1 class="h1">{{ $t('home.title') }}</h1>
    <p class="eyebrow">
      // {{ discover ? $t('home.sub.discover') : $t('home.sub.mine') }} · {{ $t('home.sub.sortedBy', { sort: $t('home.sort.' + sort) }) }}
    </p>

    <div v-if="!has42" class="readonly">
      <span class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg></span>
      <div class="readonly-main">
        <div class="readonly-t">{{ $t('home.readonly.title') }}</div>
        <div class="readonly-x">{{ $t('home.readonly.desc') }}</div>
      </div>
      <button class="readonly-btn" @click="auth.link42()"><span class="badge42-sq" style="width: 18px; height: 18px">42</span>{{ $t('common.linkYour42') }}</button>
    </div>

    <div v-if="!loading && rawPosts.length" class="sortbar" role="tablist" aria-label="Sort posts">
      <button
        v-for="s in SORTS"
        :key="s.key"
        class="sortbtn"
        :class="{ on: sort === s.key }"
        role="tab"
        :aria-selected="sort === s.key"
        @click="sort = s.key"
      >{{ $t('home.sort.' + s.key) }}</button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="loading" class="muted">{{ $t('home.loading') }}</p>
    <p v-else-if="!items.length" class="muted">
      {{ $t('home.empty.pre') }}
      <RouterLink :to="{ name: 'browse' }" style="color: var(--accent-2)">{{ $t('home.empty.link') }}</RouterLink>
      {{ $t('home.empty.post') }}
    </p>

    <div v-else class="feed">
      <article v-for="p in visible" :key="p.id" class="card">
        <div class="c-head">
          <RouterLink :to="{ name: 'project', params: { projectId: p.projectId } }" style="display: inline-flex; align-items: center; gap: 9px; text-decoration: none">
            <span class="av av-b" style="width: 22px; height: 22px; font-size: 9px; border-radius: 6px">{{ code(p.community) }}</span>
            <span class="comm">{{ p.community }}</span>
          </RouterLink>
          <span class="dot">·</span><span class="time">{{ fmtTime(p.postedAt) }}</span>
        </div>

        <RouterLink :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId } }" style="text-decoration: none; display: block">
          <h3 v-if="p.title" class="c-title">{{ p.title }}</h3>
          <p class="c-body">{{ p.content }}</p>
        </RouterLink>
        <ImageCarousel
          v-if="p.filesUrl.length"
          :images="p.filesUrl.map(publicUrl)"
          :alt="`Image shared by ${p.user?.name ?? 'anonymous'}`"
        />

        <div class="c-foot">
          <span class="votepill" :style="!has42 ? 'opacity:.45' : ''">
            <button class="vbtn up" :class="{ on: p.myVote === 'UP' }" aria-label="Upvote" @click="vote(p, 'UP')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5l7 8H5l7-8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg>
            </button>
            <span class="score" :class="{ up: p.myVote === 'UP', down: p.myVote === 'DOWN' }">{{ score(p) }}</span>
            <button class="vbtn down" :class="{ on: p.myVote === 'DOWN' }" aria-label="Downvote" @click="vote(p, 'DOWN')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 19l-7-8h14l-7 8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg>
            </button>
          </span>
          <RouterLink :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId } }" class="chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-4 3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg>
            <span class="n">{{ p._count?.chats ?? 0 }}</span> {{ $t('common.comments') }}
          </RouterLink>
        </div>
      </article>

      <button v-if="shown < items.length" class="btn-ghost" style="margin: 16px auto 0; display: flex" @click="shown += PAGE">{{ $t('common.loadMore') }}</button>
      <p v-else class="muted center" style="padding: 12px; font-size: 12px">{{ $t('home.endOfFeed') }}</p>
    </div>
  </section>
</template>

<style scoped>
.sortbar {
  display: flex;
  gap: 4px;
  margin: 4px 0 18px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}
.sortbtn {
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--muted);
  padding: 6px 12px;
  border-radius: 8px;
}
.sortbtn:hover { color: var(--text-2); background: var(--surface-2); }
.sortbtn.on { color: var(--accent-2); background: var(--surface-2); }
</style>
