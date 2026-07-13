<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { publicUrl } from '@/api/upload'
import { useAuthStore } from '@/stores/auth'
import type { Post, Comment, Reply, VoteValue } from '@/types/api'

const route = useRoute()
const auth = useAuthStore()
const postId = route.params.postId as string
const projectId = route.query.projectId as string | undefined

const post = ref<Post | null>(null)
const comments = ref<Comment[]>([])
const repliesByComment = ref<Record<string, Reply[]>>({})
const newComment = ref('')
const replyDrafts = ref<Record<string, string>>({})
const editId = ref('')
const editContent = ref('')
const loading = ref(false)
const error = ref('')

function initials(name?: string | null): string {
  if (!name) return '??'
  return name.trim().slice(0, 2).toUpperCase()
}

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
    error.value = (e as { message?: string }).message ?? 'Loading error'
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

function startEdit(id: string, content: string) {
  editId.value = id
  editContent.value = content
}

async function saveCommentEdit(c: Comment) {
  await api.patch(ROUTES.comments.edit(c.id), { content: editContent.value })
  editId.value = ''
  await loadComments()
}

async function saveReplyEdit(c: Comment, r: Reply) {
  await api.patch(ROUTES.replies.edit(r.id), { content: editContent.value })
  editId.value = ''
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
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" /></svg>
      back to thread
    </RouterLink>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Loading…</p>

    <article v-if="post" class="post">
      <div class="body">
        <div class="meta">
          <span class="av big">{{ initials(post.user?.name) }}</span>
          <span class="author">{{ post.user?.name ?? 'anonymous' }}</span>
        </div>
        <h1 v-if="post.title" class="p-title">{{ post.title }}</h1>
        <p class="p-content">{{ post.content }}</p>
        <img v-for="f in post.filesUrl" :key="f" :src="publicUrl(f)" class="p-img" alt="" />
      </div>
    </article>

    <div class="divider">
      <span class="divider-lab">COMMENTS</span>
      <span class="divider-line"></span>
      <span class="divider-n">{{ comments.length }}</span>
    </div>

    <div class="cmt-composer">
      <input
        v-model="newComment"
        class="input"
        placeholder="Add a comment…"
        @keyup.enter="addComment"
      />
      <button class="send-sq" @click="addComment">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
    </div>

    <div class="comments">
      <div v-for="c in comments" :key="c.id" class="comment">
        <div class="meta">
          <span class="av sm">{{ initials(c.user?.name) }}</span>
          <span class="author sm">{{ c.user?.name ?? 'anonymous' }}</span>
          <div class="cvotes">
            <button class="cvote" :class="{ up: c.myVote === 'UP' }" @click="voteComment(c, 'UP')">▲</button>
            <span class="cscore">{{ c.upvotes - c.downvotes }}</span>
            <button class="cvote" :class="{ down: c.myVote === 'DOWN' }" @click="voteComment(c, 'DOWN')">▼</button>
          </div>
        </div>

        <template v-if="editId === c.id">
          <input v-model="editContent" class="input" />
          <div class="c-actions">
            <button class="txt-btn accent" @click="saveCommentEdit(c)">OK</button>
            <button class="txt-btn" @click="editId = ''">cancel</button>
          </div>
        </template>
        <template v-else>
          <p class="c-content">{{ c.content }}</p>
          <img v-for="f in c.filesUrl" :key="f" :src="publicUrl(f)" class="c-img" alt="" />
          <div class="c-actions">
            <button class="txt-btn" @click="toggleReplies(c)">
              {{ c._count?.replies ?? 0 }} replies
            </button>
            <button v-if="c.writer === auth.user?.id" class="txt-btn" @click="startEdit(c.id, c.content)">edit</button>
          </div>
        </template>

        <div v-if="repliesByComment[c.id]" class="replies">
          <div v-for="r in repliesByComment[c.id]" :key="r.id" class="reply">
            <div class="meta">
              <span class="av xs">{{ initials(r.user?.name) }}</span>
              <span class="author sm">{{ r.user?.name ?? 'anonymous' }}</span>
            </div>
            <template v-if="editId === r.id">
              <input v-model="editContent" class="input" />
              <div class="c-actions">
                <button class="txt-btn accent" @click="saveReplyEdit(c, r)">OK</button>
                <button class="txt-btn" @click="editId = ''">cancel</button>
              </div>
            </template>
            <template v-else>
              <p class="c-content">{{ r.content }}</p>
              <button v-if="r.writer === auth.user?.id" class="txt-btn" @click="startEdit(r.id, r.content)">edit</button>
            </template>
          </div>
          <div class="reply-composer">
            <input v-model="replyDrafts[c.id]" class="input" placeholder="Reply…" @keyup.enter="addReply(c)" />
            <button class="txt-btn accent" @click="addReply(c)">Reply</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #74747e;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  text-decoration: none;
  margin-bottom: 16px;
}
.back:hover {
  color: #8c97f7;
}
.post {
  display: flex;
  gap: 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(17, 17, 21, 0.72);
  padding: 22px;
}
.body {
  flex: 1;
  min-width: 0;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.av {
  border-radius: 50%;
  background: linear-gradient(135deg, #5e6cf0, #8c97f7);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: #fff;
}
.av.big {
  width: 26px;
  height: 26px;
  font-size: 10px;
}
.av.sm {
  width: 22px;
  height: 22px;
  font-size: 9px;
  background: linear-gradient(135deg, #3a3a52, #54547a);
  color: #dfe2ff;
}
.av.xs {
  width: 20px;
  height: 20px;
  font-size: 9px;
}
.author {
  font-size: 13.5px;
  font-weight: 600;
  color: #cfcfd4;
}
.author.sm {
  font-size: 12.5px;
}
.p-title {
  font-size: 22px;
  font-weight: 700;
  color: #f6f6f7;
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}
.p-content {
  font-size: 14.5px;
  color: #c2c2c8;
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
}
.p-img {
  margin-top: 12px;
  max-width: 100%;
  max-height: 340px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: block;
}
.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 26px 0 14px;
}
.divider-lab {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: #74747e;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
}
.divider-n {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #5c5c66;
}
.cmt-composer {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}
.input {
  flex: 1;
  height: 44px;
  padding: 0 14px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.035);
  color: #f3f3f4;
  font: inherit;
  font-size: 14px;
  outline: none;
}
.input:focus {
  border-color: #6e7bf2;
  box-shadow: 0 0 0 3px rgba(110, 123, 242, 0.2);
}
.send-sq {
  width: 44px;
  border-radius: 11px;
  border: none;
  background: linear-gradient(180deg, #5e6cf0, #4a5fe8);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.comments {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.comment {
  border-radius: 13px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.02);
  padding: 14px 16px;
}
.cvotes {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cvote {
  background: none;
  border: none;
  color: #5c5c66;
  cursor: pointer;
  font-size: 12px;
}
.cvote.up {
  color: #8c97f7;
}
.cvote.down {
  color: #ef6d72;
}
.cscore {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #b6b6be;
}
.c-content {
  font-size: 13.5px;
  color: #b6b6be;
  line-height: 1.6;
  margin: 0 0 8px;
  white-space: pre-wrap;
}
.c-img {
  max-width: 240px;
  border-radius: 8px;
  margin: 0 0 8px;
  display: block;
}
.c-actions {
  display: flex;
  gap: 14px;
}
.txt-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #74747e;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.txt-btn:hover {
  color: #8c97f7;
}
.txt-btn.accent {
  color: #8c97f7;
}
.replies {
  margin: 12px 0 0 20px;
  padding-left: 14px;
  border-left: 2px solid #23232b;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.reply {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  padding: 12px 14px;
}
.reply-composer {
  display: flex;
  gap: 8px;
  align-items: center;
}
.muted {
  color: #74747e;
}
.error {
  color: #ef6d72;
}
</style>
