<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { uploadImage, validateImage } from '@/api/upload'
import { subscribeGroup, pusherEnabled } from '@/api/realtime'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n'
import Avatar from '@/components/Avatar.vue'
import PrivateImage from '@/components/PrivateImage.vue'
import Modal from '@/components/Modal.vue'
import type { Group, Message } from '@/types/api'

const route = useRoute()
const auth = useAuthStore()
const { t } = useI18n()

const group = ref<Group | null>(null)
const messages = ref<Message[]>([])
const draft = ref('')
const pendingFile = ref<string[]>([])
const uploadPct = ref<number | null>(null)
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
  return quoted?.content ?? t('chat.quotedMissing')
}

function groupId(): string {
  return route.params.groupId as string
}

function mine(m: Message): boolean {
  return m.sender === auth.user?.id
}

// Oldest at top, newest at bottom — don't trust the raw API order.
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
  // Decide stick-to-bottom BEFORE new content arrives, so an incoming message doesn't yank a user reading history.
  const stick = force || isNearBottom()
  try {
    const list = await api.get<Message[]>(ROUTES.groups.messages(gid))
    // Ignore a response for a group we already navigated away from.
    if (gid !== groupId()) return
    messages.value = list.slice().sort(byTime)
    if (stick) await scrollToBottom()
  } catch (e) {
    if (gid !== groupId()) return
    error.value = (e as { message?: string }).message ?? t('chat.failLoad')
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
    error.value = (e as { message?: string }).message ?? t('chat.failLoad')
  } finally {
    if (gid === groupId()) loading.value = false
  }
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const invalid = validateImage(file)
  if (invalid) {
    error.value = invalid
    input.value = ''
    return
  }
  error.value = ''
  uploadPct.value = 0
  try {
    pendingFile.value = [await uploadImage(file, true, (p) => (uploadPct.value = p))]
  } catch (err) {
    error.value = (err as { message?: string }).message ?? t('chat.uploadFailed')
  } finally {
    uploadPct.value = null
    input.value = ''
  }
}

async function send() {
  if (!draft.value.trim() && !pendingFile.value.length) return
  error.value = ''
  // Snapshot but don't clear the composer yet — if the POST fails, the text, image and reply context must survive.
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
    draft.value = ''
    pendingFile.value = []
    replyingTo.value = null
    // Optimistically show the sent message; realtime/poll will reconcile.
    if (created?.id && gid === groupId()) upsertMessage(created)
    await scrollToBottom()
  } catch (e) {
    error.value = (e as { message?: string }).message ?? t('chat.failSend')
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
    error.value = t('chat.failUpdate')
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
    error.value = t('chat.failDelete')
  }
}

function toggleGroupEdit() {
  // Re-seed from the live group so stale unsaved edits don't leak across opens.
  if (!showGroupEdit.value && group.value) {
    groupName.value = group.value.groupName
    githubLink.value = group.value.githubLink ?? ''
  }
  showGroupEdit.value = !showGroupEdit.value
}

// First validation layer, mirroring the backend GITHUB_URL_RE so both layers agree.
const GITHUB_URL_RE = /^(https?:\/\/)?(www\.)?github\.com\/.+/i

async function saveGroup() {
  error.value = ''
  const link = githubLink.value.trim()
  const original = (group.value?.githubLink ?? '').trim()
  const linkChanged = link !== original
  // Only validate/submit the link when the user actually changed it, so a legacy
  // non-github link can't block a name-only edit.
  if (linkChanged && link && !GITHUB_URL_RE.test(link)) {
    error.value = t('chat.invalidGithub')
    return
  }
  try {
    await api.patch(ROUTES.groups.edit(groupId()), {
      groupName: groupName.value.trim() || undefined,
      // Unchanged → omit (leave as-is); changed → set the new URL or null to clear.
      githubLink: linkChanged ? link || null : undefined,
    })
    group.value = await api.get<Group>(ROUTES.groups.byId(groupId()))
    showGroupEdit.value = false
  } catch (e) {
    error.value = (e as { message?: string }).message ?? t('chat.failUpdate')
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
    // fetchMessages swallows its own errors, so poll/realtime callbacks can't leak an unhandled rejection.
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
  <div class="chat">
    <header class="chat-head">
      <span class="stack">
        <Avatar
          v-for="uid in (group?.usersId ?? []).slice(0, 4)"
          :key="uid"
          class="av av-b"
          :user-id="uid"
          :name="uid"
          :size="34"
        />
        <span v-if="!group?.usersId?.length" class="av av-b ch-av">{{ (group?.groupName ?? '?').slice(0, 2).toUpperCase() }}</span>
      </span>
      <div class="chat-meta">
        <div class="chat-top">
          <span class="chat-name">{{ group?.groupName ?? $t('chat.group') }}</span>
          <span class="live"><i></i>{{ live ? $t('chat.live') : $t('chat.polling') }}</span>
        </div>
        <span class="chat-proj">{{ group?.projectName }}<template v-if="group?.usersId?.length"> · {{ group.usersId.length }} {{ $t('chat.members') }}</template></span>
      </div>
      <a v-if="group?.githubLink" :href="group.githubLink" target="_blank" rel="noopener noreferrer" class="icon-btn" aria-label="GitHub">
        <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5.1 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9 9 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 4-2.4 4.8-4.7 5.1.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 3.9-1.4 6.8-5.2 6.8-9.7C22 6.6 17.5 2 12 2z" /></svg>
      </a>
      <button class="icon-btn" :aria-label="$t('chat.editGroup')" @click="toggleGroupEdit">
        <svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18 10l-4-4L4 16v4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /><path d="M13.5 6.5 17.5 10.5" stroke="currentColor" stroke-width="1.7" /></svg>
      </button>
    </header>

    <div v-if="showGroupEdit" style="display: flex; gap: 8px; padding: 12px 0">
      <input v-model="groupName" class="field" :placeholder="$t('chat.groupName')" :aria-label="$t('chat.groupName')" />
      <input v-model="githubLink" class="field" :placeholder="$t('chat.githubLink')" :aria-label="$t('chat.githubLink')" />
      <button class="btn-primary" @click="saveGroup">{{ $t('chat.ok') }}</button>
      <button class="btn-ghost" @click="showGroupEdit = false">{{ $t('common.cancel') }}</button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>

    <div ref="listEl" class="messages" role="log" aria-live="polite" aria-relevant="additions">
      <p v-if="loading" class="muted center">{{ $t('common.loading') }}</p>
      <p v-else-if="!messages.length" class="muted center">{{ $t('chat.noMessages') }}</p>
      <div v-for="m in messages" :key="m.id" class="msg" :class="{ mine: mine(m) }">
        <Avatar class="av av-e" :user-id="m.sender" :name="m.user?.name ?? m.sender" :size="30" />
        <div class="m-body">
          <RouterLink
            v-if="!mine(m)"
            class="m-author"
            :to="{ name: 'user', params: { id: m.sender } }"
          >{{ m.user?.name ?? m.sender }}</RouterLink>
          <span v-else class="m-author">{{ $t('chat.me') }}</span>

          <div class="bubble" :class="{ mine: mine(m) }">
            <div v-if="m.messageReply" class="quote"><span>{{ quotedContent(m.messageReply) }}</span></div>
            <template v-if="editingId === m.id">
              <textarea
                v-model="editDraft"
                class="field"
                style="min-height: 36px; background: rgba(0,0,0,.2)"
                rows="1"
                :aria-label="$t('chat.editMessage')"
                @keydown.enter.exact.prevent="saveEdit(m)"
              ></textarea>
              <div class="m-actions">
                <button class="txt-btn" style="color: var(--text)" @click="saveEdit(m)">{{ $t('chat.ok') }}</button>
                <button class="txt-btn" @click="editingId = ''">{{ $t('common.cancel') }}</button>
              </div>
            </template>
            <template v-else>
              <span v-if="m.content" class="m-text">{{ m.content }}</span>
              <PrivateImage v-for="f in m.filesUrl" :key="f" :path="f" />
            </template>
          </div>

          <div v-if="editingId !== m.id" class="m-actions">
            <button class="txt-btn" @click="replyingTo = m">{{ $t('common.reply') }}</button>
            <template v-if="mine(m)">
              <button class="txt-btn" @click="startEdit(m)">{{ $t('common.edit') }}</button>
              <button class="txt-btn" @click="askDelete(m)">{{ $t('common.delete') }}</button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-if="replyingTo" class="reply-banner">
      <span class="reply-bar"></span>
      <div class="reply-main">
        <span class="reply-to">{{ $t('chat.replyingTo', { name: replyingTo.user?.name ?? replyingTo.sender }) }}</span>
        <span class="reply-content">{{ replyingTo.content }}</span>
      </div>
      <button class="icon-btn" style="width: 26px; height: 26px" :aria-label="$t('chat.cancelReply')" @click="replyingTo = null">
        <svg aria-hidden="true" focusable="false" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      </button>
    </div>

    <div class="composer" :class="{ 'no-round': replyingTo }">
      <label class="attach" :aria-label="$t('chat.attachImage')">
        <svg aria-hidden="true" focusable="false" width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>
        <input type="file" accept="image/*" class="visually-hidden" :aria-label="$t('chat.attachImage')" @change="onFile" />
      </label>
      <span v-if="uploadPct !== null" class="chip-file">{{ uploadPct }}%</span>
      <span v-else-if="pendingFile.length" class="chip-file">{{ $t('chat.imageReady') }}</span>
      <textarea
        v-model="draft"
        class="msg-input"
        rows="1"
        :placeholder="$t('chat.writeMessage')"
        :aria-label="$t('chat.writeMessage')"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <button class="send-sq" :aria-label="$t('common.send')" @click="send">
        <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
    </div>

    <Modal :open="pendingDelete !== null" :title="$t('chat.deleteConfirm')" @close="pendingDelete = null">
      <p>{{ $t('chat.cantUndo') }}</p>
      <template #actions>
        <button class="btn-ghost" style="flex: 1" @click="pendingDelete = null">{{ $t('common.cancel') }}</button>
        <button class="sbtn danger" style="flex: 1; height: 44px; justify-content: center" @click="confirmDelete">{{ $t('chat.deleteBtn') }}</button>
      </template>
    </Modal>
  </div>
</template>
