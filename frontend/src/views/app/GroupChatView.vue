<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { uploadImage } from '@/api/upload'
import { subscribeGroup, pusherEnabled } from '@/api/realtime'
import { useAuthStore } from '@/stores/auth'
import { useGroupsStore } from '@/stores/groups'
import PrivateImage from '@/components/PrivateImage.vue'
import type { Group, Message } from '@/types/api'

const route = useRoute()
const auth = useAuthStore()
const groupsStore = useGroupsStore()

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
    groupsStore.markRead(groupId())
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Erreur de chargement'
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
    error.value = "Échec de l'upload"
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
    error.value = (e as { message?: string }).message ?? 'Envoi impossible'
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
    error.value = 'Modification impossible'
  }
}

async function remove(m: Message) {
  if (!confirm('Supprimer ce message ?')) return
  try {
    await api.del(ROUTES.groups.deleteMessage(groupId(), m.id))
    await fetchMessages()
  } catch {
    error.value = 'Suppression impossible'
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
    error.value = (e as { message?: string }).message ?? 'Mise à jour impossible'
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
          <span class="ch-name">{{ group?.groupName ?? 'Groupe' }}</span>
          <span class="badge">
            <span class="badge-dot"></span>{{ live ? 'LIVE' : 'POLLING' }}
          </span>
        </div>
        <span class="ch-proj">{{ group?.projectName }}</span>
      </div>
      <a v-if="group?.githubLink" :href="group.githubLink" target="_blank" class="ch-ic" aria-label="GitHub">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5.1 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9 9 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 4-2.4 4.8-4.7 5.1.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 3.9-1.4 6.8-5.2 6.8-9.7C22 6.6 17.5 2 12 2z" /></svg>
      </a>
      <button class="ch-ic" aria-label="éditer" @click="showGroupEdit = !showGroupEdit">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18 10l-4-4L4 16v4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /><path d="M13.5 6.5 17.5 10.5" stroke="currentColor" stroke-width="1.7" /></svg>
      </button>
    </header>

    <div v-if="showGroupEdit" class="grp-edit">
      <input v-model="groupName" class="input" placeholder="Nom du groupe" />
      <input v-model="githubLink" class="input" placeholder="Lien GitHub" />
      <button class="send-btn" @click="saveGroup">OK</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div ref="listEl" class="messages scroll">
      <p v-if="loading" class="muted center">Chargement…</p>
      <div
        v-for="m in messages"
        :key="m.id"
        class="msg"
        :class="{ mine: mine(m) }"
      >
        <span v-if="!mine(m)" class="m-av">{{ initials(m.user?.name ?? m.sender) }}</span>
        <div class="m-body">
          <div class="m-meta">
            <span class="m-author">{{ mine(m) ? 'moi' : (m.user?.name ?? m.sender) }}</span>
          </div>
          <div class="bubble" :class="{ mine: mine(m) }">
            <div v-if="m.messageReply" class="quote">
              <span class="quote-content">{{ findMessage(m.messageReply)?.content ?? 'message' }}</span>
            </div>
            <template v-if="editingId === m.id">
              <input v-model="editDraft" class="input dark" @keyup.enter="saveEdit(m)" />
              <div class="m-actions">
                <button class="txt-btn accent" @click="saveEdit(m)">OK</button>
                <button class="txt-btn" @click="editingId = ''">annuler</button>
              </div>
            </template>
            <template v-else>
              <span class="m-text">{{ m.content }}</span>
              <PrivateImage v-for="f in m.filesUrl" :key="f" :path="f" />
            </template>
          </div>
          <div v-if="editingId !== m.id" class="m-actions">
            <button class="txt-btn" @click="replyingTo = m">répondre</button>
            <template v-if="mine(m)">
              <button class="txt-btn" @click="startEdit(m)">éditer</button>
              <button class="txt-btn" @click="remove(m)">suppr.</button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-if="replyingTo" class="reply-banner">
      <span class="reply-bar"></span>
      <div class="reply-main">
        <span class="reply-to">réponse à {{ replyingTo.user?.name ?? replyingTo.sender }}</span>
        <span class="reply-content">{{ replyingTo.content }}</span>
      </div>
      <button class="reply-x" aria-label="annuler" @click="replyingTo = null">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      </button>
    </div>

    <div class="composer" :class="{ 'no-round': replyingTo }">
      <label class="attach">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>
        <input type="file" accept="image/*" hidden @change="onFile" />
      </label>
      <span v-if="pendingFile.length" class="chip">image prête</span>
      <input v-model="draft" class="input" placeholder="Écris un message…" @keyup.enter="send" />
      <button class="send-btn sq" @click="send">
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
  align-items: center;
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
.input.dark {
  height: 36px;
  background: rgba(0, 0, 0, 0.2);
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
</style>
