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
    error.value = (e as { message?: string }).message ?? 'Failed to load'
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
    error.value = 'Upload failed'
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
    error.value = (e as { message?: string }).message ?? 'Could not publish'
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
    error.value = (e as { message?: string }).message ?? 'Could not save changes'
  }
}

watch(() => route.params.projectId, load, { immediate: true })
</script>

<template>
  <section>
    <div class="head">
      <div class="head-main">
        <span class="proj-name">{{ projectName() }}</span>
        <span class="badge">42</span>
      </div>
      <RouterLink
        :to="{ name: 'suggest', params: { projectId: projectId() } }"
        class="btn-ghost find"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" /><path d="M17 8v6M14 11h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" /></svg>
        Find teammates
      </RouterLink>
    </div>
    <p class="sub mono">// project feed · {{ posts.length }} posts</p>

    <div class="composer card card-pad">
      <input v-model="newTitle" class="input" placeholder="Post title" />
      <textarea
        v-model="newContent"
        rows="3"
        class="input body-input"
        placeholder="Share an update or a question…"
      ></textarea>
      <div class="c-row">
        <label class="btn-ghost c-img">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="1.7" /><circle cx="9" cy="10" r="1.8" stroke="currentColor" stroke-width="1.7" /><path d="m4 18 5-4 4 3 3-3 4 3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg>
          {{ newFiles.length ? 'Image ready' : 'Image' }}
          <input type="file" accept="image/*" hidden @change="onFile" />
        </label>
        <button class="btn" :disabled="creating" @click="createPost">
          {{ creating ? 'Publishing…' : 'Publish' }}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="!posts.length" class="muted">No posts yet.</p>

    <div class="posts">
      <article v-for="p in posts" :key="p.id" class="post card">
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
          <div class="meta-row">
            <span class="avatar av">{{ initials(p.user?.name) }}</span>
            <RouterLink
              :to="{ name: 'user', params: { id: p.writer } }"
              class="author"
            >
              {{ p.user?.name ?? 'anonymous' }}
            </RouterLink>
            <button
              v-if="p.writer === auth.user?.id && editId !== p.id"
              class="edit"
              @click="startEdit(p)"
            >
              edit
            </button>
          </div>

          <template v-if="editId === p.id">
            <input v-model="editTitle" class="input" placeholder="Title" />
            <textarea v-model="editContent" rows="3" class="input body-input"></textarea>
            <div class="edit-row">
              <button class="btn small" @click="saveEdit(p)">Save</button>
              <button class="txt-btn" @click="editId = ''">cancel</button>
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
                {{ p._count?.chats ?? 0 }} comments
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
.head-main {
  display: flex;
  align-items: center;
  gap: 10px;
}
.proj-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
}
.find {
  margin-left: auto;
  height: 36px;
  font-size: 13px;
}
.sub {
  margin: 0 0 22px;
  font-size: 12.5px;
  color: var(--color-muted);
}

.composer {
  margin-bottom: 22px;
}
.body-input {
  min-height: 84px;
  margin-top: 10px;
}
.c-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}
.c-img {
  height: 40px;
  font-size: 13px;
  cursor: pointer;
}
.btn.small {
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
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
.txt-btn:hover {
  color: var(--color-text-dim);
}

.posts {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.post {
  display: flex;
  gap: 14px;
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
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.14s, color 0.14s, background 0.14s;
}
.vote:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text-dim);
}
.vote.up {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.vote.down {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
.score {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-dim);
}
.score.up {
  color: var(--color-accent);
}
.body {
  flex: 1;
  min-width: 0;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.av {
  width: 24px;
  height: 24px;
  font-size: 10px;
}
.author {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-dim);
  text-decoration: none;
}
.author:hover {
  color: var(--color-text);
}
.edit {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-muted);
  background: none;
  border: 1px solid var(--color-border);
  padding: 4px 9px;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s;
}
.edit:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
}
.open {
  display: block;
  text-decoration: none;
}
.p-title {
  font-size: 16.5px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 6px;
}
.p-excerpt {
  font-size: 14px;
  color: var(--color-text-dim);
  line-height: 1.55;
  margin: 0;
  white-space: pre-wrap;
}
.p-img {
  margin-top: 12px;
  max-width: 100%;
  max-height: 320px;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
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
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-muted);
  text-decoration: none;
  transition: color 0.14s;
}
.cmt:hover {
  color: var(--color-text-dim);
}
</style>
