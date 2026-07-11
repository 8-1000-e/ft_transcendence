<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { uploadImage, publicUrl } from '@/api/upload'
import { useAuthStore } from '@/stores/auth'
import { useGroupsStore } from '@/stores/groups'
import type { Post, VoteValue } from '@/types/api'

const route = useRoute()
const auth = useAuthStore()
const groups = useGroupsStore()
const posts = ref<Post[]>([])
const loading = ref(false)
const error = ref('')

const editId = ref('')
const editTitle = ref('')
const editContent = ref('')

const newTitle = ref('')
const newContent = ref('')
const newFiles = ref<string[]>([])
const creating = ref(false)

function projectId(): string {
  return route.params.projectId as string
}

function projectName(): string {
  return (
    groups.projects().find((p) => p.projectId === projectId())?.projectName ??
    projectId()
  )
}

function initials(name?: string | null): string {
  if (!name) return '??'
  return name.trim().slice(0, 2).toUpperCase()
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

function startEdit(p: Post) {
  editId.value = p.id
  editTitle.value = p.title ?? ''
  editContent.value = p.content
}

async function saveEdit(p: Post) {
  try {
    await api.patch(ROUTES.posts.edit(projectId(), p.id), {
      title: editTitle.value || undefined,
      content: editContent.value,
    })
    editId.value = ''
    await load()
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Modification impossible'
  }
}

watch(() => route.params.projectId, load, { immediate: true })
</script>

<template>
  <section>
    <div class="head">
      <span class="proj-name">{{ projectName() }}</span>
      <span class="proj-tag">42</span>
    </div>
    <p class="sub">// le fil du projet · {{ posts.length }} posts</p>

    <div class="composer">
      <div class="sheen"><div class="sheen-move"></div></div>
      <input v-model="newTitle" class="c-title" placeholder="Titre du post" />
      <textarea
        v-model="newContent"
        rows="3"
        class="c-body"
        placeholder="Partage une prédiction, une analyse…"
      ></textarea>
      <div class="c-row">
        <label class="c-img">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="1.7" /><circle cx="9" cy="10" r="1.8" stroke="currentColor" stroke-width="1.7" /><path d="m4 18 5-4 4 3 3-3 4 3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg>
          {{ newFiles.length ? 'image prête' : 'Image' }}
          <input type="file" accept="image/*" hidden @change="onFile" />
        </label>
        <button class="c-send" :disabled="creating" @click="createPost">
          {{ creating ? 'Publication…' : 'Publier' }}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Chargement…</p>
    <p v-else-if="!posts.length" class="muted">Aucun post pour ce projet.</p>

    <div class="posts">
      <article v-for="p in posts" :key="p.id" class="post">
        <div class="votes">
          <button
            class="vote"
            :class="{ up: p.myVote === 'UP' }"
            aria-label="upvote"
            @click="vote(p, 'UP')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5l7 8H5l7-8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg>
          </button>
          <span class="score" :class="{ up: p.myVote === 'UP' }">{{ p.upvotes - p.downvotes }}</span>
          <button
            class="vote"
            :class="{ down: p.myVote === 'DOWN' }"
            aria-label="downvote"
            @click="vote(p, 'DOWN')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19l-7-8h14l-7 8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg>
          </button>
        </div>

        <div class="body">
          <div class="meta">
            <span class="av">{{ initials(p.user?.name) }}</span>
            <span class="author">{{ p.user?.name ?? 'anonyme' }}</span>
            <button
              v-if="p.writer === auth.user?.id && editId !== p.id"
              class="edit"
              @click="startEdit(p)"
            >
              éditer
            </button>
          </div>

          <template v-if="editId === p.id">
            <input v-model="editTitle" class="c-title" placeholder="Titre" />
            <textarea v-model="editContent" rows="3" class="c-body"></textarea>
            <div class="edit-row">
              <button class="c-send small" @click="saveEdit(p)">Enregistrer</button>
              <button class="txt-btn" @click="editId = ''">annuler</button>
            </div>
          </template>
          <template v-else>
            <RouterLink
              :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId ?? projectId() } }"
              class="open"
            >
              <h3 v-if="p.title" class="p-title">{{ p.title }}</h3>
              <p class="p-excerpt">{{ p.content }}</p>
            </RouterLink>
            <img v-for="f in p.filesUrl" :key="f" :src="publicUrl(f)" class="p-img" alt="" />
            <div class="p-foot">
              <RouterLink
                :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId ?? projectId() } }"
                class="cmt"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-4 3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg>
                {{ p._count?.chats ?? 0 }} commentaires
              </RouterLink>
            </div>
          </template>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}
.proj-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 700;
  color: #dfe2ff;
}
.proj-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: #74747e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3px 8px;
  border-radius: 999px;
}
.sub {
  margin: 0 0 22px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  color: #74747e;
}
.composer {
  position: relative;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(17, 17, 21, 0.72);
  padding: 18px;
  margin-bottom: 22px;
  overflow: hidden;
}
.sheen {
  position: absolute;
  top: 0;
  left: 22px;
  right: 22px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(140, 151, 247, 0.7), transparent);
  overflow: hidden;
}
.sheen-move {
  position: absolute;
  inset: 0;
  width: 40%;
  background: linear-gradient(90deg, transparent, #cdd3ff, transparent);
  animation: ftpSheen 6s ease-in-out infinite;
}
.c-title,
.c-body {
  width: 100%;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.035);
  color: #f3f3f4;
  outline: none;
  font: inherit;
}
.c-title {
  height: 44px;
  padding: 0 14px;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
}
.c-body {
  padding: 12px 14px;
  font-size: 14px;
  resize: none;
  line-height: 1.55;
}
.c-title:focus,
.c-body:focus {
  border-color: #6e7bf2;
  box-shadow: 0 0 0 3px rgba(110, 123, 242, 0.2);
}
.c-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}
.c-img {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 13px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.035);
  color: #b6b6be;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.c-img:hover {
  border-color: rgba(255, 255, 255, 0.2);
}
.c-send {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(180deg, #5e6cf0, #4a5fe8);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 22px -12px rgba(74, 95, 232, 0.8);
}
.c-send:hover {
  filter: brightness(1.08);
}
.c-send:disabled {
  opacity: 0.6;
}
.c-send.small {
  height: 36px;
  padding: 0 14px;
}
.edit-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}
.txt-btn {
  background: none;
  border: none;
  color: #74747e;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
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
.av {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3a3a52, #54547a);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #dfe2ff;
}
.author {
  font-size: 13px;
  font-weight: 600;
  color: #cfcfd4;
}
.edit {
  margin-left: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #74747e;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.09);
  padding: 4px 9px;
  border-radius: 8px;
  cursor: pointer;
}
.edit:hover {
  color: #8c97f7;
  border-color: rgba(110, 123, 242, 0.4);
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
  margin: 0;
  white-space: pre-wrap;
}
.p-img {
  margin-top: 12px;
  max-width: 100%;
  max-height: 320px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: block;
}
.p-foot {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
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
