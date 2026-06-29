<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { uploadImage, publicUrl } from '@/api/upload'
import type { Post, VoteValue } from '@/types/api'

const route = useRoute()
const posts = ref<Post[]>([])
const loading = ref(false)
const error = ref('')

const newTitle = ref('')
const newContent = ref('')
const newFiles = ref<string[]>([])
const creating = ref(false)

function projectId(): string {
  return route.params.projectId as string
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    posts.value = await api.get<Post[]>(ROUTES.posts.listByProject(projectId()))
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

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    newFiles.value = [await uploadImage(file, false)]
  } catch {
    error.value = "Échec de l'upload"
  }
}

async function createPost() {
  if (!newContent.value.trim()) return
  creating.value = true
  try {
    await api.post(ROUTES.posts.create(projectId()), {
      title: newTitle.value || undefined,
      content: newContent.value,
      filesUrl: newFiles.value.length ? newFiles.value : undefined,
    })
    newTitle.value = ''
    newContent.value = ''
    newFiles.value = []
    await load()
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Publication impossible'
  } finally {
    creating.value = false
  }
}

watch(() => route.params.projectId, load, { immediate: true })
</script>

<template>
  <section>
    <h1 class="title">Posts du projet</h1>

    <form class="composer" @submit.prevent="createPost">
      <input v-model="newTitle" class="input" placeholder="Titre (optionnel)" />
      <textarea
        v-model="newContent"
        class="input"
        rows="3"
        placeholder="Écris un post…"
      ></textarea>
      <div class="composer-row">
        <label class="attach">
          📎 image
          <input type="file" accept="image/*" hidden @change="onFile" />
        </label>
        <span v-if="newFiles.length" class="muted">image prête</span>
        <button class="btn" :disabled="creating">
          {{ creating ? 'Publication…' : 'Publier' }}
        </button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Chargement…</p>
    <p v-else-if="!posts.length" class="muted">Aucun post pour ce projet.</p>

    <ul v-else class="list">
      <li v-for="p in posts" :key="p.id" class="post">
        <div class="votes">
          <button
            class="vote"
            :class="{ active: p.myVote === 'UP' }"
            @click="vote(p, 'UP')"
          >
            ▲
          </button>
          <span class="score">{{ p.upvotes - p.downvotes }}</span>
          <button
            class="vote"
            :class="{ active: p.myVote === 'DOWN' }"
            @click="vote(p, 'DOWN')"
          >
            ▼
          </button>
        </div>
        <div class="post-body">
          <p class="post-author">{{ p.user?.name ?? 'anonyme' }}</p>
          <h3 v-if="p.title" class="post-title">{{ p.title }}</h3>
          <p class="post-content">{{ p.content }}</p>
          <img
            v-for="f in p.filesUrl"
            :key="f"
            :src="publicUrl(f)"
            class="post-img"
            alt=""
          />
          <RouterLink
            :to="{
              name: 'post',
              params: { postId: p.id },
              query: { projectId: p.projectId ?? projectId() },
            }"
            class="post-link"
          >
            {{ p._count?.chats ?? 0 }} commentaire(s)
          </RouterLink>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.title {
  font-size: 22px;
  margin: 0 0 16px;
}
.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}
.composer-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.attach {
  cursor: pointer;
  color: var(--color-muted);
  font-size: 13px;
}
.input {
  width: 100%;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: #f3f3f4;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
}
.btn {
  margin-left: auto;
  border: none;
  background: var(--color-accent);
  color: #fff;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.6;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.post {
  display: flex;
  gap: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  background: var(--color-surface);
}
.votes {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.vote {
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 14px;
}
.vote.active {
  color: var(--color-accent);
}
.score {
  font-size: 13px;
}
.post-body {
  min-width: 0;
}
.post-author {
  font-size: 12px;
  color: var(--color-muted);
  margin: 0 0 4px;
}
.post-title {
  margin: 0 0 4px;
  font-size: 16px;
}
.post-content {
  margin: 0 0 8px;
  white-space: pre-wrap;
}
.post-img {
  max-width: 280px;
  border-radius: 8px;
  margin: 0 0 8px;
  display: block;
}
.post-link {
  font-size: 13px;
  color: var(--color-accent);
  text-decoration: none;
}
.muted {
  color: var(--color-muted);
}
.error {
  color: #ef6d72;
}
</style>
