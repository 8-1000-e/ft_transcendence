<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { ActivityPost, ActivityComment } from '@/types/api'

const props = defineProps<{ posts: ActivityPost[]; comments: ActivityComment[] }>()

const tab = ref<'posts' | 'comments'>('posts')

// Paginate each tab independently.
const PAGE = 6
const postsShown = ref(PAGE)
const commentsShown = ref(PAGE)
const visiblePosts = computed(() => props.posts.slice(0, postsShown.value))
const visibleComments = computed(() => props.comments.slice(0, commentsShown.value))

function fmtDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div>
    <div class="acttabs">
      <button class="acttab" :class="{ on: tab === 'posts' }" @click="tab = 'posts'">
        {{ $t('common.posts') }}<span class="acttab-n">{{ posts.length }}</span>
      </button>
      <button class="acttab" :class="{ on: tab === 'comments' }" @click="tab = 'comments'">
        {{ $t('common.comments') }}<span class="acttab-n">{{ comments.length }}</span>
      </button>
    </div>

    <div v-if="tab === 'posts'">
      <RouterLink
        v-for="p in visiblePosts"
        :key="p.id"
        :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId } }"
        class="act"
      >
        <div class="act-vote">
          <div class="v" :class="{ neg: p.upvotes - p.downvotes < 0 }">{{ p.upvotes - p.downvotes }}</div>
          <div class="k">{{ $t('common.score') }}</div>
        </div>
        <div class="act-main">
          <p class="act-ctx">r/{{ p.projectName || p.projectId }} · {{ fmtDate(p.postedAt) }}</p>
          <p class="act-title">{{ p.title || p.content }}</p>
          <p v-if="p.title" class="act-body">{{ p.content }}</p>
        </div>
      </RouterLink>
      <div v-if="!posts.length" class="empty-state"><p>{{ $t('common.noPosts') }}</p></div>
      <button
        v-else-if="postsShown < posts.length"
        class="btn-ghost"
        style="margin: 12px auto 0; display: flex"
        @click="postsShown += PAGE"
      >{{ $t('common.loadMore') }}</button>
    </div>

    <div v-else>
      <component
        :is="c.postId ? 'RouterLink' : 'div'"
        v-for="c in visibleComments"
        :key="c.id"
        :to="c.postId ? { name: 'post', params: { postId: c.postId }, query: { projectId: c.projectId ?? undefined } } : undefined"
        class="act"
        :class="{ 'act-static': !c.postId }"
      >
        <div class="act-vote">
          <div class="v" :class="{ neg: c.upvotes - c.downvotes < 0 }">{{ c.upvotes - c.downvotes }}</div>
          <div class="k">{{ $t('common.score') }}</div>
        </div>
        <div class="act-main">
          <p class="act-ctx">
            {{ $t('common.commentedOn') }} <b>{{ c.postTitle || $t('common.aPost') }}</b>
            <template v-if="c.projectName"> · r/{{ c.projectName }}</template>
            · {{ fmtDate(c.postedAt) }}
          </p>
          <p class="act-title comment">{{ c.content }}</p>
        </div>
      </component>
      <div v-if="!comments.length" class="empty-state"><p>{{ $t('common.noComments') }}</p></div>
      <button
        v-else-if="commentsShown < comments.length"
        class="btn-ghost"
        style="margin: 12px auto 0; display: flex"
        @click="commentsShown += PAGE"
      >{{ $t('common.loadMore') }}</button>
    </div>
  </div>
</template>

<style scoped>
.acttab-n {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
  margin-left: 7px;
}
.acttab.on .acttab-n {
  color: var(--accent-2);
}
.act-ctx b {
  color: var(--text-2);
  font-weight: 600;
}
.act-title.comment {
  font-weight: 500;
  color: var(--text-2);
}
.act-static {
  cursor: default;
}
</style>
