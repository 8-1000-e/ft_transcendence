<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import type { Post, Comment, Reply, VoteValue } from '@/types/api'

const route = useRoute()
const postId = route.params.postId as string
const projectId = route.query.projectId as string | undefined

const post = ref<Post | null>(null)
const comments = ref<Comment[]>([])
const repliesByComment = ref<Record<string, Reply[]>>({})
const newComment = ref('')
const replyDrafts = ref<Record<string, string>>({})
const loading = ref(false)
const error = ref('')

async function loadPost() {
  if (!projectId) return
  try {
    const posts = await api.get<Post[]>(ROUTES.posts.listByProject(projectId))
    post.value = posts.find((p) => p.id === postId) ?? null
  } catch {
    /* post header optional */
  }
}

async function loadComments() {
  comments.value = await api.get<Comment[]>(ROUTES.comments.listByPost(postId))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([loadPost(), loadComments()])
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

async function addComment() {
  if (!newComment.value.trim()) return
  await api.post(ROUTES.comments.create(postId), { content: newComment.value })
  newComment.value = ''
  await loadComments()
}

async function voteComment(c: Comment, value: VoteValue) {
  await api.post(ROUTES.comments.vote(c.id), { vote: value })
  await loadComments()
}

async function toggleReplies(c: Comment) {
  if (repliesByComment.value[c.id]) {
    delete repliesByComment.value[c.id]
    return
  }
  repliesByComment.value[c.id] = await api.get<Reply[]>(
    ROUTES.replies.listByComment(c.id),
  )
}

async function addReply(c: Comment) {
  const draft = replyDrafts.value[c.id]
  if (!draft?.trim()) return
  await api.post(ROUTES.replies.create(c.id), { content: draft })
  replyDrafts.value[c.id] = ''
  repliesByComment.value[c.id] = await api.get<Reply[]>(
    ROUTES.replies.listByComment(c.id),
  )
}

onMounted(load)
</script>

<template>
  <section>
    <RouterLink
      v-if="projectId"
      :to="{ name: 'project', params: { projectId } }"
      class="back"
      >← retour au projet</RouterLink
    >

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Chargement…</p>

    <article v-if="post" class="post">
      <p class="author">{{ post.user?.name ?? 'anonyme' }}</p>
      <h1 v-if="post.title" class="title">{{ post.title }}</h1>
      <p class="content">{{ post.content }}</p>
    </article>

    <h2 class="subtitle">Commentaires</h2>
    <form class="composer" @submit.prevent="addComment">
      <textarea
        v-model="newComment"
        class="input"
        rows="2"
        placeholder="Ajouter un commentaire…"
      ></textarea>
      <button class="btn">Commenter</button>
    </form>

    <ul class="list">
      <li v-for="c in comments" :key="c.id" class="comment">
        <div class="row">
          <button class="vote" :class="{ active: c.myVote === 'UP' }" @click="voteComment(c, 'UP')">▲</button>
          <span class="score">{{ c.upvotes - c.downvotes }}</span>
          <button class="vote" :class="{ active: c.myVote === 'DOWN' }" @click="voteComment(c, 'DOWN')">▼</button>
          <span class="author">{{ c.user?.name ?? 'anonyme' }}</span>
        </div>
        <p class="content">{{ c.content }}</p>
        <button class="link-btn" @click="toggleReplies(c)">
          {{ c._count?.replies ?? 0 }} réponse(s)
        </button>

        <div v-if="repliesByComment[c.id]" class="replies">
          <div v-for="r in repliesByComment[c.id]" :key="r.id" class="reply">
            <span class="author">{{ r.user?.name ?? 'anonyme' }}</span>
            <p class="content">{{ r.content }}</p>
          </div>
          <form class="composer" @submit.prevent="addReply(c)">
            <input
              v-model="replyDrafts[c.id]"
              class="input"
              placeholder="Répondre…"
            />
            <button class="btn">Répondre</button>
          </form>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.back {
  color: var(--color-accent);
  text-decoration: none;
  font-size: 13px;
}
.post {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px;
  margin: 12px 0 20px;
  background: var(--color-surface);
}
.title {
  font-size: 20px;
  margin: 4px 0;
}
.subtitle {
  font-size: 15px;
  margin: 16px 0 10px;
}
.author {
  font-size: 12px;
  color: var(--color-muted);
}
.content {
  white-space: pre-wrap;
  margin: 6px 0;
}
.composer {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.input {
  flex: 1;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: #f3f3f4;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
}
.btn {
  border: none;
  background: var(--color-accent);
  color: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.comment {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  background: var(--color-surface);
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.vote {
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
}
.vote.active {
  color: var(--color-accent);
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  padding: 0;
  font-size: 13px;
}
.replies {
  margin: 10px 0 0 16px;
  padding-left: 12px;
  border-left: 1px solid var(--color-border);
}
.reply {
  margin-bottom: 8px;
}
.muted {
  color: var(--color-muted);
}
.error {
  color: #ef6d72;
}
</style>
