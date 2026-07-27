<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'
import { usePaginated } from '@/composables/pagination'
import { useI18n } from '@/i18n'
import { relativeTime } from '@/utils/time'
import ImageCarousel from '@/components/ImageCarousel.vue'
import FileAttachment from '@/components/FileAttachment.vue'
import { publicUrl, isImageUrl } from '@/api/upload'
import type { Page, Post, VoteValue } from '@/types/api'

const auth = useAuthStore()
const { t } = useI18n()

interface FeedPost extends Post {
  community: string
}

const has42 = computed(() => !!auth.user?.has42)

// Server-side feed: latest posts across every catalogued project, cursor-paginated.
const {
  items: posts,
  loading,
  done,
  loadMore,
  reload,
} = usePaginated<FeedPost>((cursor) =>
  api.get<Page<FeedPost>>(`${ROUTES.feed}?limit=20${cursor ? `&cursor=${cursor}` : ''}`),
)

type SortKey = 'hot' | 'new' | 'top' | 'discussed'
const SORTS: { key: SortKey }[] = [
  { key: 'hot' },
  { key: 'new' },
  { key: 'top' },
  { key: 'discussed' },
]
const sort = ref<SortKey>('hot')

function score(p: Post): number {
  return p.upvotes - p.downvotes
}
function ageHours(iso: string): number {
  const t2 = new Date(iso).getTime()
  if (Number.isNaN(t2)) return 9999
  return Math.max(0, (Date.now() - t2) / 3_600_000)
}
// Upvote-weighted with a gentle time decay so fresh, well-received posts rise.
function hotRank(p: FeedPost): number {
  return score(p) / Math.pow(ageHours(p.postedAt) + 2, 1.3)
}

// Re-rank the loaded window client-side; tabs never refetch.
const items = computed<FeedPost[]>(() => {
  const list = posts.value.slice()
  const recent = (a: FeedPost, b: FeedPost) => +new Date(b.postedAt) - +new Date(a.postedAt)
  if (sort.value === 'new') list.sort(recent)
  else if (sort.value === 'top') list.sort((a, b) => score(b) - score(a) || recent(a, b))
  else if (sort.value === 'discussed')
    list.sort((a, b) => (b._count?.chats ?? 0) - (a._count?.chats ?? 0) || recent(a, b))
  else list.sort((a, b) => hotRank(b) - hotRank(a) || recent(a, b))
  return list
})

function fmtTime(iso?: string | null): string {
  return relativeTime(iso, t)
}

function code(name?: string | null): string {
  return (name ?? '??').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??'
}

// Swap a single post in place after a vote — reloading the whole feed would
// blank the list and lose scroll position. /post/:id has no `community`, keep it.
async function replacePost(id: string) {
  try {
    const fresh = await api.get<Post>(ROUTES.posts.single(id))
    const i = posts.value.findIndex((p) => p.id === id)
    if (i !== -1) posts.value[i] = { ...fresh, community: posts.value[i].community }
  } catch {
    /* ignore */
  }
}

async function vote(post: FeedPost, value: VoteValue) {
  if (!has42.value) return
  try {
    await api.post(ROUTES.posts.vote(post.id), { vote: value })
    await replacePost(post.id)
  } catch {
    /* ignore */
  }
}

watch(sort, () => window.scrollTo({ top: 0 }))
onMounted(reload)
</script>

<template>
  <section>
    <h1 class="h1">{{ $t('home.title') }}</h1>
    <p class="eyebrow">
      // {{ $t('home.sub.discover') }} · {{ $t('home.sub.sortedBy', { sort: $t('home.sort.' + sort) }) }}
    </p>

    <div v-if="!has42" class="readonly">
      <span class="ic"><svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg></span>
      <div class="readonly-main">
        <div class="readonly-t">{{ $t('home.readonly.title') }}</div>
        <div class="readonly-x">{{ $t('home.readonly.desc') }}</div>
      </div>
      <button class="readonly-btn" @click="auth.link42()"><span class="badge42-sq" style="width: 18px; height: 18px">42</span>{{ $t('common.linkYour42') }}</button>
    </div>

    <div v-if="posts.length" class="sortbar" role="tablist" aria-label="Sort posts">
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

    <p v-if="loading && !posts.length" class="muted" role="status">{{ $t('home.loading') }}</p>
    <p v-else-if="!posts.length" class="muted">
      {{ $t('home.empty.pre') }}
      <RouterLink :to="{ name: 'browse' }" style="color: var(--accent-2)">{{ $t('home.empty.link') }}</RouterLink>
      {{ $t('home.empty.post') }}
    </p>

    <div v-else class="feed">
      <article v-for="p in items" :key="p.id" class="card">
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
          v-if="p.filesUrl.some(isImageUrl)"
          :images="p.filesUrl.filter(isImageUrl).map(publicUrl)"
          :alt="`Image shared by ${p.user?.name ?? 'anonymous'}`"
        />
        <FileAttachment v-for="f in p.filesUrl.filter((u) => !isImageUrl(u))" :key="f" :path="f" />

        <div class="c-foot">
          <span class="votepill" :style="!has42 ? 'opacity:.45' : ''">
            <button class="vbtn up" :class="{ on: p.myVote === 'UP' }" :aria-pressed="p.myVote === 'UP'" aria-label="Upvote" @click="vote(p, 'UP')">
              <svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5l7 8H5l7-8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg>
            </button>
            <span class="score" :class="{ up: p.myVote === 'UP', down: p.myVote === 'DOWN' }">{{ score(p) }}</span>
            <button class="vbtn down" :class="{ on: p.myVote === 'DOWN' }" :aria-pressed="p.myVote === 'DOWN'" aria-label="Downvote" @click="vote(p, 'DOWN')">
              <svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 19l-7-8h14l-7 8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg>
            </button>
          </span>
          <RouterLink :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId } }" class="chip">
            <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-4 3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg>
            <span class="n">{{ p._count?.chats ?? 0 }}</span> {{ $t('common.comments') }}
          </RouterLink>
        </div>
      </article>

      <button v-if="!done" class="btn-ghost" style="margin: 16px auto 0; display: flex" :disabled="loading" @click="loadMore">{{ loading ? $t('common.loading') : $t('common.loadMore') }}</button>
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
