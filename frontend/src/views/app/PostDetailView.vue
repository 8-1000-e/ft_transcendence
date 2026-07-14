<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { publicUrl } from '@/api/upload'
import { useAuthStore } from '@/stores/auth'
import { usePaginated } from '@/composables/pagination'
import { useI18n } from '@/i18n'
import Avatar from '@/components/Avatar.vue'
import ImageCarousel from '@/components/ImageCarousel.vue'
import CommentNode from '@/components/CommentNode.vue'
import type { Page, Post, Comment, VoteValue } from '@/types/api'

const route = useRoute()
const auth = useAuthStore()
const { t } = useI18n()
const postId = route.params.postId as string
const projectId = route.query.projectId as string | undefined

const post = ref<Post | null>(null)
const {
  items: comments,
  loading: commentsLoading,
  done: commentsDone,
  loadMore: loadMoreComments,
  reload: reloadComments,
} = usePaginated<Comment>((cursor) =>
  api.get<Page<Comment>>(
    `${ROUTES.comments.listByPost(postId)}?limit=10${cursor ? `&cursor=${cursor}` : ''}`,
  ),
)
const newComment = ref('')
const loading = ref(false)
const error = ref('')

const has42 = computed(() => !!auth.user?.has42)

function message(e: unknown, fallback: string): string {
  return (e as { message?: string }).message ?? fallback
}
function score(v: { upvotes: number; downvotes: number }): number {
  return v.upvotes - v.downvotes
}
function timeAgo(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return t('forum.now')
  if (mins < 60) return `${mins}m`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

async function loadPost() {
  try {
    post.value = await api.get<Post>(ROUTES.posts.single(postId))
  } catch (e) {
    post.value = null
    error.value = message(e, t('forum.loadPostFailed'))
  }
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([loadPost(), reloadComments()])
  } catch (e) {
    error.value = message(e, t('forum.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function votePost(value: VoteValue) {
  if (!post.value || !has42.value) return
  try {
    await api.post(ROUTES.posts.vote(post.value.id), { vote: value })
    await loadPost()
  } catch (e) {
    error.value = message(e, t('forum.voteFailed'))
  }
}

async function addComment() {
  if (!newComment.value.trim()) return
  error.value = ''
  const body = newComment.value.trim()
  try {
    const created = await api.post<{ id: string; content?: string; filesUrl?: string[]; postedAt?: string }>(
      ROUTES.comments.create(postId),
      { content: body },
    )
    newComment.value = ''
    // Append locally instead of reloadComments(): the thread is oldest-first, so
    // the new comment belongs at the bottom, and a reload would reset to page 1
    // (potentially hiding a comment that lives on a later page).
    comments.value.push({
      id: created.id,
      content: created.content ?? body,
      filesUrl: created.filesUrl ?? [],
      postedAt: created.postedAt ?? new Date().toISOString(),
      editedAt: null,
      writer: auth.user?.id ?? '',
      user: {
        name: auth.user?.name ?? t('forum.me'),
        ftPfpUrl: auth.user?.ftPfpUrl ?? null,
        campus: auth.user?.campus ?? null,
      },
      upvotes: 0,
      downvotes: 0,
      myVote: null,
      _count: { replies: 0 },
    })
  } catch (e) {
    error.value = message(e, t('forum.commentFailed'))
  }
}

onMounted(load)
</script>

<template>
  <section>
    <RouterLink
      v-if="projectId"
      :to="{ name: 'project', params: { projectId } }"
      class="back-link"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" /></svg>
      {{ $t('forum.backToProject') }}
    </RouterLink>

    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <p v-if="loading" class="muted">{{ $t('common.loading') }}</p>

    <div v-else-if="!post" class="lock">
      <h2>{{ $t('forum.postNotFound') }}</h2>
      <p>{{ $t('forum.postNotFoundDesc') }}</p>
      <RouterLink :to="{ name: 'feed' }" class="pbtn">{{ $t('forum.backToHome') }}</RouterLink>
    </div>

    <template v-else>
      <!-- ── Post ── -->
      <article class="card">
        <div class="c-head">
          <RouterLink
            v-if="post.writer"
            :to="{ name: 'user', params: { id: post.writer } }"
            style="display: inline-flex; align-items: center; gap: 9px; text-decoration: none"
          >
            <Avatar class="av av-e" :user-id="post.writer" :name="post.user?.name ?? '??'" :size="26" />
            <span class="pcard-author">{{ post.user?.name ?? $t('forum.anonymous') }}</span>
          </RouterLink>
          <span class="time">· {{ timeAgo(post.postedAt) }}</span>
        </div>
        <h1 v-if="post.title" class="pcard-title" style="font-size: 22px">{{ post.title }}</h1>
        <p class="pcard-body" style="font-size: 14.5px; line-height: 1.7">{{ post.content }}</p>
        <ImageCarousel v-if="post.filesUrl.length" :images="post.filesUrl.map(publicUrl)" :alt="post.title || $t('forum.postImage')" />
        <div class="c-foot" style="margin-top: 16px">
          <span class="votepill" :style="!has42 ? 'opacity:.45' : ''">
            <button class="vbtn up" :class="{ on: post.myVote === 'UP' }" :aria-label="$t('forum.upvote')" @click="votePost('UP')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5l7 8H5l7-8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg></button>
            <span class="score" :class="{ up: post.myVote === 'UP', down: post.myVote === 'DOWN' }">{{ score(post) }}</span>
            <button class="vbtn down" :class="{ on: post.myVote === 'DOWN' }" :aria-label="$t('forum.downvote')" @click="votePost('DOWN')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 19l-7-8h14l-7 8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg></button>
          </span>
          <span class="chip"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-4 3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg><span class="n">{{ comments.length }}</span> {{ $t('common.comments') }}</span>
        </div>
      </article>

      <!-- ── Comment composer ── -->
      <div v-if="has42" class="composer" style="margin: 18px 0">
        <input v-model="newComment" class="msg-input" :placeholder="$t('forum.addComment')" :aria-label="$t('forum.addComment')" @keyup.enter="addComment" />
        <button class="send-sq" :aria-label="$t('forum.sendComment')" @click="addComment"><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
      </div>
      <div v-else class="readonly" style="margin: 18px 0">
        <span class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg></span>
        <div class="readonly-main"><div class="readonly-t">{{ $t('common.readonly') }}</div><div class="readonly-x">{{ $t('forum.readonlyJoin') }}</div></div>
        <button class="readonly-btn" @click="auth.link42()"><span class="badge42-sq" style="width:18px;height:18px">42</span>{{ $t('common.linkYour42') }}</button>
      </div>

      <div class="thread-head">
        <span class="thread-lab">{{ comments.length }}{{ commentsDone ? '' : '+' }} {{ comments.length === 1 ? $t('common.comment') : $t('common.comments') }}</span>
      </div>
      <p v-if="!comments.length && commentsDone" class="muted">{{ $t('forum.noComments') }}</p>

      <!-- ── Comment thread (oldest first; replies recurse via CommentNode) ── -->
      <div class="thread">
        <CommentNode
          v-for="c in comments"
          :key="c.id"
          :node="c"
          :depth="0"
          :has42="has42"
          @error="error = $event"
        />
      </div>

      <p v-if="commentsLoading" class="muted center" style="padding: 14px">{{ $t('forum.loadingComments') }}</p>
      <button
        v-else-if="!commentsDone && comments.length"
        class="btn-ghost"
        style="margin: 14px auto 0; display: flex"
        @click="loadMoreComments"
      >{{ $t('forum.loadMoreComments') }}</button>
    </template>
  </section>
</template>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
  text-decoration: none;
  margin-bottom: 16px;
}
.back-link:hover { color: var(--accent-2); }

.thread-head { margin: 24px 0 8px; }
.thread-lab {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.thread { display: flex; flex-direction: column; }
</style>
