<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { publicUrl } from '@/api/upload'
import type { Post, VoteValue } from '@/types/api'

const posts = ref<Post[]>([])
const loading = ref(false)
const error = ref('')

function initials(name?: string | null): string {
  if (!name) return '??'
  return name.trim().slice(0, 2).toUpperCase()
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    posts.value = await api.get<Post[]>(ROUTES.posts.feed)
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

async function vote(post: Post, value: VoteValue) {
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
    <h1 class="title">Feed</h1>
    <p class="sub">// les derniers posts du campus, tous projets confondus.</p>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Chargement…</p>
    <p v-else-if="!posts.length" class="muted">
      Aucun post pour l'instant. Ouvre un projet pour publier le premier.
    </p>

    <div class="posts">
      <article v-for="p in posts" :key="p.id" class="post">
        <div class="votes">
          <button class="vote" :class="{ up: p.myVote === 'UP' }" aria-label="upvote" @click="vote(p, 'UP')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5l7 8H5l7-8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg>
          </button>
          <span class="score" :class="{ up: p.myVote === 'UP' }">{{ p.upvotes - p.downvotes }}</span>
          <button class="vote" :class="{ down: p.myVote === 'DOWN' }" aria-label="downvote" @click="vote(p, 'DOWN')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19l-7-8h14l-7 8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg>
          </button>
        </div>

        <div class="body">
          <div class="meta">
            <RouterLink
              :to="{ name: 'project', params: { projectId: p.projectId } }"
              class="proj-tag"
            >
              {{ p.projectName ?? 'projet' }}
            </RouterLink>
            <span class="av">{{ initials(p.user?.name) }}</span>
            <span class="author">{{ p.user?.name ?? 'anonyme' }}</span>
          </div>
          <RouterLink
            :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId } }"
            class="open"
          >
            <h3 v-if="p.title" class="p-title">{{ p.title }}</h3>
            <p class="p-excerpt">{{ p.content }}</p>
          </RouterLink>
          <img v-for="f in p.filesUrl" :key="f" :src="publicUrl(f)" class="p-img" alt="" />
          <RouterLink
            :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId } }"
            class="cmt"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-4 3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg>
            {{ p._count?.chats ?? 0 }} commentaires
          </RouterLink>
        </div>
      </article>
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
.posts {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.post {
  display: flex;
  gap: 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(17, 17, 21, 0.6);
  padding: 16px 18px;
}
.votes {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-top: 2px;
}
.vote {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #74747e;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.vote.up {
  border-color: rgba(110, 123, 242, 0.5);
  background: rgba(110, 123, 242, 0.16);
  color: #8c97f7;
}
.vote.down {
  border-color: rgba(239, 109, 114, 0.4);
  background: rgba(239, 109, 114, 0.12);
  color: #ef6d72;
}
.score {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #b6b6be;
}
.score.up {
  color: #8c97f7;
}
.body {
  flex: 1;
  min-width: 0;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.proj-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #8c97f7;
  border: 1px solid rgba(110, 123, 242, 0.35);
  background: rgba(110, 123, 242, 0.1);
  padding: 3px 8px;
  border-radius: 999px;
  text-decoration: none;
}
.proj-tag:hover {
  background: rgba(110, 123, 242, 0.2);
}
.av {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3a3a52, #54547a);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #dfe2ff;
}
.author {
  font-size: 13px;
  font-weight: 600;
  color: #cfcfd4;
}
.open {
  display: block;
  text-decoration: none;
}
.p-title {
  font-size: 16.5px;
  font-weight: 700;
  color: #f0f0f2;
  margin: 0 0 6px;
}
.p-excerpt {
  font-size: 14px;
  color: #b6b6be;
  line-height: 1.55;
  margin: 0 0 8px;
  white-space: pre-wrap;
}
.p-img {
  max-width: 100%;
  max-height: 320px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: block;
  margin: 0 0 8px;
}
.cmt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #74747e;
  text-decoration: none;
}
.cmt:hover {
  color: #8c97f7;
}
.muted {
  color: #74747e;
}
.error {
  color: #ef6d72;
}
</style>
