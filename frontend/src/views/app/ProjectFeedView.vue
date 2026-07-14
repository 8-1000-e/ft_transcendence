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

const composerOpen = ref(false)
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

function resetComposer() {
  newTitle.value = ''
  newContent.value = ''
  newFiles.value = []
}

function closeComposer() {
  composerOpen.value = false
  resetComposer()
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
    resetComposer()
    composerOpen.value = false
    await load()
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed to publish'
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
    error.value = (e as { message?: string }).message ?? 'Failed to update'
  }
}

watch(() => route.params.projectId, load, { immediate: true })
</script>

<template>
  <section>
    <header class="head">
      <div class="head-main">
        <span class="proj-name">{{ projectName() }}</span>
        <span class="proj-tag">42</span>
      </div>
      <RouterLink
        :to="{ name: 'suggest', params: { projectId: projectId() } }"
        class="suggest-link"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>
        Suggest a team
      </RouterLink>
    </header>
    <p class="sub">// the project feed · {{ posts.length }} posts</p>

    <!-- Post composer — collapsed by default, clearly delimited from the feed -->
    <div class="composer" :class="{ open: composerOpen }">
      <div class="sheen"><div class="sheen-move"></div></div>

      <button
        v-if="!composerOpen"
        type="button"
        class="composer-trigger"
        @click="composerOpen = true"
      >
        <span class="ct-av">{{ initials(auth.user?.name) }}</span>
        <span class="ct-text">Start a discussion…</span>
        <svg class="ct-plus" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      </button>

      <template v-else>
        <div class="composer-head">
          <span class="composer-title">New post</span>
          <button
            type="button"
            class="composer-close"
            aria-label="Close composer"
            @click="closeComposer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" /></svg>
          </button>
        </div>
        <input
          v-model="newTitle"
          class="c-title"
          placeholder="Post title"
          aria-label="Post title"
        />
        <textarea
          v-model="newContent"
          rows="4"
          class="c-body"
          placeholder="Share your thoughts, a question, or feedback…"
          aria-label="Post content"
        ></textarea>
        <div class="c-row">
          <label class="c-img">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="1.7" /><circle cx="9" cy="10" r="1.8" stroke="currentColor" stroke-width="1.7" /><path d="m4 18 5-4 4 3 3-3 4 3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg>
            {{ newFiles.length ? 'image ready' : 'Image' }}
            <input type="file" accept="image/*" hidden aria-label="Attach an image" @change="onFile" />
          </label>
          <div class="c-actions">
            <button type="button" class="txt-btn" @click="closeComposer">Cancel</button>
            <button
              class="c-send"
              :disabled="creating || !newContent.trim()"
              @click="createPost"
            >
              {{ creating ? 'Publishing…' : 'Publish' }}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
          </div>
        </div>
      </template>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="!posts.length" class="muted">No posts for this project yet.</p>

    <div class="posts">
      <article v-for="p in posts" :key="p.id" class="post">
        <div class="votes">
          <button
            class="vote"
            :class="{ up: p.myVote === 'UP' }"
            aria-label="Upvote"
            @click="vote(p, 'UP')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5l7 8H5l7-8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg>
          </button>
          <span class="score" :class="{ up: p.myVote === 'UP' }">{{ p.upvotes - p.downvotes }}</span>
          <button
            class="vote"
            :class="{ down: p.myVote === 'DOWN' }"
            aria-label="Downvote"
            @click="vote(p, 'DOWN')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 19l-7-8h14l-7 8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg>
          </button>
        </div>

        <div class="body">
          <div class="meta">
            <RouterLink :to="{ name: 'user', params: { id: p.writer } }" class="author-link">
              <span class="av">{{ initials(p.user?.name) }}</span>
              <span class="author">{{ p.user?.name ?? 'anonymous' }}</span>
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
            <input
              v-model="editTitle"
              class="c-title"
              placeholder="Title"
              aria-label="Post title"
            />
            <textarea
              v-model="editContent"
              rows="3"
              class="c-body"
              aria-label="Post content"
            ></textarea>
            <div class="edit-row">
              <button class="c-send small" @click="saveEdit(p)">Save</button>
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
            <img
              v-for="f in p.filesUrl"
              :key="f"
              :src="publicUrl(f)"
              class="p-img"
              :alt="`Image shared by ${p.user?.name ?? 'anonymous'}`"
            />
            <div class="p-foot">
              <RouterLink
                :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId ?? projectId() } }"
                class="cmt"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v11H9l-4 3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg>
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
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}
.head-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.proj-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 700;
  color: #dfe2ff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.proj-tag {
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: #74747e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3px 8px;
  border-radius: 999px;
}
.suggest-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(110, 123, 242, 0.35);
  background: rgba(110, 123, 242, 0.1);
  color: #b9c0ff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.14s, background 0.14s, color 0.14s;
}
.suggest-link:hover {
  border-color: rgba(110, 123, 242, 0.6);
  background: rgba(110, 123, 242, 0.18);
  color: #dfe2ff;
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
  margin-bottom: 22px;
  overflow: hidden;
}
.composer.open {
  padding: 18px;
  border-color: rgba(110, 123, 242, 0.28);
}
.composer-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font: inherit;
}
.composer-trigger:hover {
  background: rgba(255, 255, 255, 0.02);
}
.ct-av {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3a3a52, #54547a);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #dfe2ff;
}
.ct-text {
  flex: 1;
  color: #74747e;
  font-size: 14px;
}
.ct-plus {
  flex-shrink: 0;
  color: #8c97f7;
}
.composer-trigger:hover .ct-text {
  color: #9a9aa2;
}
.composer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.composer-title {
  font-size: 14px;
  font-weight: 700;
  color: #ededee;
}
.composer-close {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #9a9aa2;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s;
}
.composer-close:hover {
  color: #ededee;
  border-color: rgba(255, 255, 255, 0.2);
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
.c-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
  cursor: default;
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
.txt-btn:hover {
  color: #b6b6be;
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
  transition: border-color 0.14s;
}
.post:hover {
  border-color: rgba(255, 255, 255, 0.12);
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
.author-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
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
  transition: color 0.14s;
}
.author-link:hover .author {
  color: #8c97f7;
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
