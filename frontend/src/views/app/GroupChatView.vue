<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { uploadImage } from '@/api/upload'
import { subscribeGroup, pusherEnabled } from '@/api/realtime'
import { useAuthStore } from '@/stores/auth'
import PrivateImage from '@/components/PrivateImage.vue'
import type { Group, Message } from '@/types/api'

const route = useRoute()
const auth = useAuthStore()

const group = ref<Group | null>(null)
const messages = ref<Message[]>([])
const draft = ref('')
const pendingFile = ref<string[]>([])
const replyingTo = ref<Message | null>(null)
const loading = ref(false)
const error = ref('')
const listEl = ref<HTMLElement | null>(null)

const editingId = ref('')
const editDraft = ref('')

const showGroupEdit = ref(false)
const groupName = ref('')
const githubLink = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null
let unsub: (() => void) | null = null

const live = computed(() => pusherEnabled())

function groupId(): string {
  return route.params.groupId as string
}

function initials(name?: string | null): string {
  if (!name) return '??'
  return name.trim().slice(0, 2).toUpperCase()
}

function findMessage(id: string | null): Message | undefined {
  return id ? messages.value.find((m) => m.id === id) : undefined
}

function mine(m: Message): boolean {
  return m.sender === auth.user?.id
}

async function fetchMessages(scroll = false) {
  const m = await api.get<Message[]>(ROUTES.groups.messages(groupId()))
  messages.value = m.slice().reverse()
  if (scroll) {
    await nextTick()
    listEl.value?.scrollTo({ top: listEl.value.scrollHeight })
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    group.value = await api.get<Group>(ROUTES.groups.byId(groupId()))
    groupName.value = group.value.groupName
    githubLink.value = group.value.githubLink ?? ''
    await fetchMessages(true)
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed to load'
  } finally {
    loading.value = false
  }
}

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    pendingFile.value = [await uploadImage(file, true)]
  } catch {
    error.value = 'Upload failed'
  }
}

async function send() {
  if (!draft.value.trim() && !pendingFile.value.length) return
  const content = draft.value || '(image)'
  const filesUrl = pendingFile.value
  const replyId = replyingTo.value?.id
  draft.value = ''
  pendingFile.value = []
  replyingTo.value = null
  try {
    const path = replyId
      ? ROUTES.groups.replyMessage(groupId(), replyId)
      : ROUTES.groups.sendMessage(groupId())
    await api.post(path, {
      content,
      filesUrl: filesUrl.length ? filesUrl : undefined,
    })
    await fetchMessages(true)
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Could not send message'
  }
}

function startEdit(m: Message) {
  editingId.value = m.id
  editDraft.value = m.content
}

async function saveEdit(m: Message) {
  try {
    await api.patch(ROUTES.groups.editMessage(groupId(), m.id), {
      content: editDraft.value,
    })
    editingId.value = ''
    await fetchMessages()
  } catch {
    error.value = 'Could not edit message'
  }
}

async function remove(m: Message) {
  if (!confirm('Delete this message?')) return
  try {
    await api.del(ROUTES.groups.deleteMessage(groupId(), m.id))
    await fetchMessages()
  } catch {
    error.value = 'Could not delete message'
  }
}

async function saveGroup() {
  try {
    await api.patch(ROUTES.groups.edit(groupId()), {
      groupName: groupName.value || undefined,
      githubLink: githubLink.value || undefined,
    })
    group.value = await api.get<Group>(ROUTES.groups.byId(groupId()))
    showGroupEdit.value = false
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Could not update group'
  }
}

function teardown() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  if (unsub) unsub()
  unsub = null
}

watch(
  () => route.params.groupId,
  () => {
    teardown()
    load()
    if (live.value) {
      unsub = subscribeGroup(groupId(), () => fetchMessages())
    } else {
      pollTimer = setInterval(() => fetchMessages(), 4000)
    }
  },
  { immediate: true },
)

onBeforeUnmount(teardown)
</script>

<template>
  <section class="chat">
    <header class="chat-head">
      <span class="ch-av">{{ initials(group?.groupName) }}</span>
      <div class="ch-main">
        <div class="ch-top">
          <span class="ch-name">{{ group?.groupName ?? 'Group' }}</span>
          <span class="badge">
            <span class="badge-dot"></span>{{ live ? 'LIVE' : 'POLLING' }}
          </span>
        </div>
        <span class="ch-proj">{{ group?.projectName }}</span>
      </div>
      <a
        v-if="group?.githubLink"
        :href="group.githubLink"
        target="_blank"
        class="icon-btn"
        aria-label="GitHub"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5.1 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9 9 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 4-2.4 4.8-4.7 5.1.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 3.9-1.4 6.8-5.2 6.8-9.7C22 6.6 17.5 2 12 2z" /></svg>
      </a>
      <button class="icon-btn" aria-label="Edit group" @click="showGroupEdit = !showGroupEdit">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18 10l-4-4L4 16v4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /><path d="M13.5 6.5 17.5 10.5" stroke="currentColor" stroke-width="1.7" /></svg>
      </button>
    </header>

    <div v-if="showGroupEdit" class="grp-edit">
      <input v-model="groupName" class="input" placeholder="Group name" />
      <input v-model="githubLink" class="input" placeholder="GitHub link" />
      <button class="btn" @click="saveGroup">Save</button>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <div ref="listEl" class="messages scroll">
      <p v-if="loading" class="muted center">Loading…</p>
      <div
        v-for="m in messages"
        :key="m.id"
        class="msg"
        :class="{ mine: mine(m) }"
      >
        <span v-if="!mine(m)" class="m-av">{{ initials(m.user?.name ?? m.sender) }}</span>
        <div class="m-body">
          <div class="m-meta">
            <span class="m-author">{{ mine(m) ? 'you' : (m.user?.name ?? m.sender) }}</span>
          </div>
          <div class="bubble" :class="{ mine: mine(m) }">
            <div v-if="m.messageReply" class="quote">
              <span class="quote-content">{{ findMessage(m.messageReply)?.content ?? 'message' }}</span>
            </div>
            <template v-if="editingId === m.id">
              <input v-model="editDraft" class="input edit-in" @keyup.enter="saveEdit(m)" />
              <div class="m-actions">
                <button class="txt-btn accent" @click="saveEdit(m)">Save</button>
                <button class="txt-btn" @click="editingId = ''">cancel</button>
              </div>
            </template>
            <template v-else>
              <span class="m-text">{{ m.content }}</span>
              <PrivateImage v-for="f in m.filesUrl" :key="f" :path="f" />
            </template>
          </div>
          <div v-if="editingId !== m.id" class="m-actions">
            <button class="txt-btn" @click="replyingTo = m">reply</button>
            <template v-if="mine(m)">
              <button class="txt-btn" @click="startEdit(m)">edit</button>
              <button class="txt-btn" @click="remove(m)">delete</button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-if="replyingTo" class="reply-banner">
      <span class="reply-bar"></span>
      <div class="reply-main">
        <span class="reply-to">replying to {{ replyingTo.user?.name ?? replyingTo.sender }}</span>
        <span class="reply-content">{{ replyingTo.content }}</span>
      </div>
      <button class="reply-x" aria-label="cancel" @click="replyingTo = null">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      </button>
    </div>

    <div class="composer" :class="{ 'no-round': replyingTo }">
      <label class="attach">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>
        <input type="file" accept="image/*" hidden @change="onFile" />
      </label>
      <span v-if="pendingFile.length" class="chip">image ready</span>
      <input v-model="draft" class="input" placeholder="Write a message…" @keyup.enter="send" />
      <button class="send-btn" aria-label="Send" @click="send">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 112px);
}

/* ---- header ---- */
.chat-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}
.ch-av {
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-dim);
}
.ch-main {
  flex: 1;
  min-width: 0;
}
.ch-top {
  display: flex;
  align-items: center;
  gap: 9px;
}
.ch-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}
.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
}
.ch-proj {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-muted);
}

/* ---- group edit row ---- */
.grp-edit {
  display: flex;
  gap: 8px;
  padding: 14px 0;
}
.grp-edit .btn {
  flex-shrink: 0;
}

/* ---- message list ---- */
.messages {
  flex: 1;
  padding: 20px 2px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.msg {
  display: flex;
  gap: 10px;
  max-width: 78%;
}
.msg.mine {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.m-av {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-dim);
}
.m-body {
  min-width: 0;
}
.msg.mine .m-body {
  text-align: right;
}
.m-meta {
  margin-bottom: 4px;
}
.m-author {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-muted);
}

/* ---- bubbles ---- */
.bubble {
  display: inline-block;
  text-align: left;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 10px 14px;
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.5;
}
.bubble.mine {
  background: var(--color-surface-2);
  border-color: var(--color-border-strong);
}
.quote {
  border-left: 2px solid var(--color-accent);
  padding: 2px 0 2px 10px;
  margin-bottom: 7px;
}
.quote-content {
  font-size: 12.5px;
  color: var(--color-text-dim);
}
.m-text {
  white-space: pre-wrap;
}
.edit-in {
  height: 36px;
}
.m-actions {
  display: flex;
  gap: 12px;
  margin-top: 5px;
}
.msg.mine .m-actions {
  justify-content: flex-end;
}
.txt-btn {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.14s;
}
.txt-btn:hover {
  color: var(--color-text);
}
.txt-btn.accent {
  color: var(--color-accent);
}
.txt-btn.accent:hover {
  color: var(--color-accent-hover);
}

/* ---- reply banner ---- */
.reply-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius) var(--radius) 0 0;
  border: 1px solid var(--color-border);
  border-bottom: none;
  background: var(--color-surface-2);
}
.reply-bar {
  width: 3px;
  height: 28px;
  background: var(--color-accent);
  border-radius: 2px;
}
.reply-main {
  flex: 1;
  min-width: 0;
}
.reply-to {
  display: block;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--color-accent);
}
.reply-content {
  display: block;
  font-size: 12px;
  color: var(--color-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reply-x {
  width: 26px;
  height: 26px;
  border-radius: var(--radius);
  border: none;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.14s;
}
.reply-x:hover {
  color: var(--color-text);
}

/* ---- composer ---- */
.composer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
}
.composer.no-round {
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}
.attach {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-dim);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.14s, border-color 0.14s;
}
.attach:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
}
.chip {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-muted);
}
.composer .input {
  flex: 1;
}
.send-btn {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  background: var(--color-accent);
  color: #fff;
  cursor: pointer;
  border-radius: var(--radius);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.14s;
}
.send-btn:hover {
  background: var(--color-accent-hover);
}

.center {
  text-align: center;
}
</style>
