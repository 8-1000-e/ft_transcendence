<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { uploadImage } from '@/api/upload'
import { subscribeGroup, pusherEnabled } from '@/api/realtime'
import { useAuthStore } from '@/stores/auth'
import PrivateImage from '@/components/PrivateImage.vue'
import Modal from '@/components/Modal.vue'
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

const pendingDelete = ref<Message | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null
let unsub: (() => void) | null = null

const live = computed(() => pusherEnabled())

// O(1) lookup for reply quotes instead of an Array.find per rendered row.
const messageById = computed(() => {
  const map = new Map<string, Message>()
  for (const m of messages.value) map.set(m.id, m)
  return map
})

function quotedContent(id: string | null): string {
  const quoted = id ? messageById.value.get(id) : undefined
  return quoted?.content ?? 'message'
}

function groupId(): string {
  return route.params.groupId as string
}

function initials(name?: string | null): string {
  if (!name) return '??'
  return name.trim().slice(0, 2).toUpperCase()
}

function mine(m: Message): boolean {
  return m.sender === auth.user?.id
}

// Chronological order does not depend on the raw API order: oldest at top,
// newest at the bottom.
function byTime(a: Message, b: Message): number {
  return new Date(a.sendTime).getTime() - new Date(b.sendTime).getTime()
}

function isNearBottom(): boolean {
  const el = listEl.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 120
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  const el = listEl.value
  if (el) el.scrollTo({ top: el.scrollHeight })
}

// Merge a single message in place (dedupe by id), keeping the list sorted.
function upsertMessage(msg: Message): void {
  const map = new Map<string, Message>()
  for (const m of messages.value) map.set(m.id, m)
  map.set(msg.id, msg)
  messages.value = [...map.values()].sort(byTime)
}

async function fetchMessages(force = false): Promise<void> {
  const gid = groupId()
  // Decide whether to stick to the bottom BEFORE new content arrives so an
  // incoming message doesn't yank a user who scrolled up to read history.
  const stick = force || isNearBottom()
  try {
    const list = await api.get<Message[]>(ROUTES.groups.messages(gid))
    // Ignore a response for a group we already navigated away from.
    if (gid !== groupId()) return
    messages.value = list.slice().sort(byTime)
    if (stick) await scrollToBottom()
  } catch (e) {
    if (gid !== groupId()) return
    error.value = (e as { message?: string }).message ?? 'Failed to load'
  }
}

async function load() {
  const gid = groupId()
  loading.value = true
  error.value = ''
  // Clear stale content so switching groups doesn't flash the previous chat.
  messages.value = []
  group.value = null
  try {
    const g = await api.get<Group>(ROUTES.groups.byId(gid))
    if (gid !== groupId()) return
    group.value = g
    groupName.value = g.groupName
    githubLink.value = g.githubLink ?? ''
    await fetchMessages(true)
  } catch (e) {
    if (gid !== groupId()) return
    error.value = (e as { message?: string }).message ?? 'Failed to load'
  } finally {
    if (gid === groupId()) loading.value = false
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
  error.value = ''
  // Snapshot but do NOT clear the composer yet: if the POST fails the user's
  // text, image and reply context must survive.
  const content = draft.value.trim()
  const filesUrl = pendingFile.value.slice()
  const replyId = replyingTo.value?.id
  const gid = groupId()
  try {
    const path = replyId
      ? ROUTES.groups.replyMessage(gid, replyId)
      : ROUTES.groups.sendMessage(gid)
    const created = await api.post<Message>(path, {
      content,
      filesUrl: filesUrl.length ? filesUrl : undefined,
    })
    // Success — now it's safe to reset the composer.
    draft.value = ''
    pendingFile.value = []
    replyingTo.value = null
    // Optimistically show the sent message; realtime/poll will reconcile.
    if (created?.id && gid === groupId()) upsertMessage(created)
    await scrollToBottom()
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed to send'
  }
}

function startEdit(m: Message) {
  editingId.value = m.id
  editDraft.value = m.content
}

async function saveEdit(m: Message) {
  error.value = ''
  try {
    await api.patch(ROUTES.groups.editMessage(groupId(), m.id), {
      content: editDraft.value,
    })
    editingId.value = ''
    await fetchMessages()
  } catch {
    error.value = 'Failed to update'
  }
}

function askDelete(m: Message) {
  pendingDelete.value = m
}

async function confirmDelete() {
  const m = pendingDelete.value
  if (!m) return
  error.value = ''
  try {
    await api.del(ROUTES.groups.deleteMessage(groupId(), m.id))
    pendingDelete.value = null
    await fetchMessages()
  } catch {
    pendingDelete.value = null
    error.value = 'Failed to delete'
  }
}

function toggleGroupEdit() {
  // Re-seed the form from the live group so stale unsaved edits never leak
  // across opens.
  if (!showGroupEdit.value && group.value) {
    groupName.value = group.value.groupName
    githubLink.value = group.value.githubLink ?? ''
  }
  showGroupEdit.value = !showGroupEdit.value
}

async function saveGroup() {
  error.value = ''
  try {
    await api.patch(ROUTES.groups.edit(groupId()), {
      groupName: groupName.value || undefined,
      // Send the raw value (empty string included) so a link can be cleared.
      githubLink: githubLink.value,
    })
    group.value = await api.get<Group>(ROUTES.groups.byId(groupId()))
    showGroupEdit.value = false
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed to update'
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
    // fetchMessages swallows its own errors, so the poll/realtime callbacks
    // can never leak an unhandled rejection.
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
        rel="noopener noreferrer"
        class="ch-ic"
        aria-label="GitHub"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5.1 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9 9 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 4-2.4 4.8-4.7 5.1.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 3.9-1.4 6.8-5.2 6.8-9.7C22 6.6 17.5 2 12 2z" /></svg>
      </a>
      <button class="ch-ic" aria-label="edit" @click="toggleGroupEdit">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18 10l-4-4L4 16v4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /><path d="M13.5 6.5 17.5 10.5" stroke="currentColor" stroke-width="1.7" /></svg>
      </button>
    </header>

    <div v-if="showGroupEdit" class="grp-edit">
      <input v-model="groupName" class="input" placeholder="Group name" aria-label="Group name" />
      <input v-model="githubLink" class="input" placeholder="GitHub link" aria-label="GitHub link" />
      <button class="send-btn" @click="saveGroup">OK</button>
      <button class="send-btn ghost" @click="showGroupEdit = false">Cancel</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div ref="listEl" class="messages">
      <p v-if="loading" class="muted center">Loading…</p>
      <p v-else-if="!messages.length" class="muted center">No messages yet.</p>
      <div
        v-for="m in messages"
        :key="m.id"
        class="msg"
        :class="{ mine: mine(m) }"
      >
        <span v-if="!mine(m)" class="m-av">{{ initials(m.user?.name ?? m.sender) }}</span>
        <div class="m-body">
          <div class="m-meta">
            <RouterLink
              v-if="!mine(m)"
              class="m-author"
              :to="{ name: 'user', params: { id: m.sender } }"
            >{{ m.user?.name ?? m.sender }}</RouterLink>
            <span v-else class="m-author">me</span>
          </div>
          <div class="bubble" :class="{ mine: mine(m) }">
            <div v-if="m.messageReply" class="quote">
              <span class="quote-content">{{ quotedContent(m.messageReply) }}</span>
            </div>
            <template v-if="editingId === m.id">
              <textarea
                v-model="editDraft"
                class="input dark"
                rows="1"
                aria-label="Edit message"
                @keydown.enter.exact.prevent="saveEdit(m)"
              ></textarea>
              <div class="m-actions">
                <button class="txt-btn accent" @click="saveEdit(m)">OK</button>
                <button class="txt-btn" @click="editingId = ''">cancel</button>
              </div>
            </template>
            <template v-else>
              <span v-if="m.content" class="m-text">{{ m.content }}</span>
              <PrivateImage v-for="f in m.filesUrl" :key="f" :path="f" />
            </template>
          </div>
          <div v-if="editingId !== m.id" class="m-actions">
            <button class="txt-btn" @click="replyingTo = m">reply</button>
            <template v-if="mine(m)">
              <button class="txt-btn" @click="startEdit(m)">edit</button>
              <button class="txt-btn" @click="askDelete(m)">del.</button>
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
      <label class="attach" aria-label="Attach image">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>
        <input type="file" accept="image/*" hidden @change="onFile" />
      </label>
      <span v-if="pendingFile.length" class="chip">image ready</span>
      <textarea
        v-model="draft"
        class="input"
        rows="1"
        placeholder="Write a message…"
        aria-label="Write a message"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <button class="send-btn sq" aria-label="Send" @click="send">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
    </div>

    <Modal
      :open="pendingDelete !== null"
      title="Delete this message?"
      @close="pendingDelete = null"
    >
      <p>This can't be undone.</p>
      <template #actions>
        <button class="mbtn" @click="pendingDelete = null">Cancel</button>
        <button class="mbtn danger" @click="confirmDelete">Delete</button>
      </template>
    </Modal>
  </section>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 112px);
  height: calc(100dvh - 112px);
}
.chat-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #1c1c22;
}
.ch-av {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: linear-gradient(135deg, #5e6cf0, #8c97f7);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
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
  color: #f0f0f2;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: #7e7e88;
  border: 1px solid rgba(255, 255, 255, 0.09);
  padding: 3px 8px;
  border-radius: 999px;
}
.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5ee08a;
  box-shadow: 0 0 8px #5ee08a;
  animation: ftpPulse 1.8s ease-in-out infinite;
}
.ch-proj {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #74747e;
}
.ch-ic {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: #9a9aa2;
  background: none;
  cursor: pointer;
}
.ch-ic:hover {
  color: #ededee;
  border-color: rgba(255, 255, 255, 0.2);
}
.grp-edit {
  display: flex;
  gap: 8px;
  padding: 12px 0;
}
.messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
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
  background: linear-gradient(135deg, #3a3a52, #54547a);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #dfe2ff;
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
  font-size: 12.5px;
  font-weight: 600;
  color: #cfcfd4;
  text-decoration: none;
}
a.m-author:hover {
  color: #8c97f7;
}
.bubble {
  display: inline-block;
  text-align: left;
  background: #17171d;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 4px 14px 14px 14px;
  padding: 10px 14px;
  font-size: 14px;
  color: #e4e4e8;
  line-height: 1.5;
}
.bubble.mine {
  background: linear-gradient(180deg, #4d5bd8, #3f4fc9);
  border: none;
  border-radius: 14px 4px 14px 14px;
  color: #fff;
}
.quote {
  border-left: 2px solid #6e7bf2;
  padding: 2px 0 2px 10px;
  margin-bottom: 7px;
  opacity: 0.85;
}
.quote-content {
  font-size: 12.5px;
  color: #9a9aa2;
}
.bubble.mine .quote-content {
  color: rgba(255, 255, 255, 0.7);
}
.m-text {
  white-space: pre-wrap;
}
.m-actions {
  display: flex;
  gap: 12px;
  margin-top: 5px;
}
.msg.mine .m-actions {
  justify-content: flex-end;
}
.reply-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px 10px 0 0;
  border: 1px solid #23232b;
  border-bottom: none;
  background: rgba(110, 123, 242, 0.08);
}
.reply-bar {
  width: 3px;
  height: 28px;
  background: #6e7bf2;
  border-radius: 2px;
}
.reply-main {
  flex: 1;
  min-width: 0;
}
.reply-to {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: #8c97f7;
}
.reply-content {
  display: block;
  font-size: 12px;
  color: #9a9aa2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reply-x {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: #9a9aa2;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.composer {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px;
  border: 1px solid #23232b;
  border-radius: 14px;
  background: rgba(17, 17, 21, 0.72);
}
.composer.no-round {
  border-radius: 0 0 14px 14px;
}
.attach {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.035);
  color: #9a9aa2;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.attach:hover {
  color: #ededee;
}
.chip {
  align-self: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #74747e;
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
textarea.input {
  height: auto;
  min-height: 44px;
  max-height: 140px;
  padding: 11px 14px;
  line-height: 1.45;
  resize: none;
  overflow-y: auto;
}
.input.dark {
  height: 36px;
  background: rgba(0, 0, 0, 0.2);
}
textarea.input.dark {
  height: auto;
  min-height: 36px;
  padding: 8px 12px;
}
.input:focus {
  border-color: #6e7bf2;
  box-shadow: 0 0 0 3px rgba(110, 123, 242, 0.2);
}
.send-btn {
  border: none;
  background: linear-gradient(180deg, #5e6cf0, #4a5fe8);
  color: #fff;
  cursor: pointer;
  border-radius: 11px;
  padding: 0 16px;
  height: 44px;
  font: inherit;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.send-btn.ghost {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cfcfd4;
}
.send-btn.ghost:hover {
  color: #ededee;
  border-color: rgba(255, 255, 255, 0.24);
  filter: none;
}
.send-btn.sq {
  width: 44px;
  padding: 0;
  flex-shrink: 0;
}
.send-btn:hover {
  filter: brightness(1.08);
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
  color: #fff;
}
.muted {
  color: #74747e;
}
.center {
  text-align: center;
}
.error {
  color: #ef6d72;
}
.mbtn {
  border-radius: 10px;
  padding: 9px 16px;
  font: inherit;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #cfcfd4;
}
.mbtn:hover {
  color: #ededee;
  border-color: rgba(255, 255, 255, 0.24);
}
.mbtn.danger {
  border: none;
  background: linear-gradient(180deg, #e0575c, #d0474c);
  color: #fff;
}
.mbtn.danger:hover {
  filter: brightness(1.08);
}
</style>
