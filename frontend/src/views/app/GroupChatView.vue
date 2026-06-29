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

function findMessage(id: string | null): Message | undefined {
  return id ? messages.value.find((m) => m.id === id) : undefined
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
      <div>
        <h1 class="title">{{ group?.groupName ?? 'Groupe' }}</h1>
        <span class="muted">
          {{ group?.projectName }}
          <a
            v-if="group?.githubLink"
            :href="group.githubLink"
            target="_blank"
            class="gh"
            >GitHub</a
          >
          · <span>{{ live ? 'live' : 'polling' }}</span>
        </span>
      </div>
      <button class="link-btn" @click="showGroupEdit = !showGroupEdit">
        ✎ éditer
      </button>
    </header>

    <div v-if="showGroupEdit" class="group-edit">
      <input v-model="groupName" class="input" placeholder="Nom du groupe" />
      <input
        v-model="githubLink"
        class="input"
        placeholder="Lien GitHub (https://…)"
      />
      <button class="btn" @click="saveGroup">Enregistrer</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Chargement…</p>

    <div ref="listEl" class="messages">
      <div
        v-for="m in messages"
        :key="m.id"
        class="msg"
        :class="{ mine: m.sender === auth.user?.id }"
      >
        <p class="msg-author">{{ m.user?.name ?? m.sender }}</p>
        <p v-if="m.messageReply" class="msg-reply">
          ↳ {{ findMessage(m.messageReply)?.content ?? 'message' }}
        </p>

        <template v-if="editingId === m.id">
          <input v-model="editDraft" class="input" />
          <div class="msg-actions">
            <button class="link-btn" @click="saveEdit(m)">OK</button>
            <button class="link-btn" @click="editingId = ''">annuler</button>
          </div>
        </template>
        <template v-else>
          <p class="msg-content">{{ m.content }}</p>
          <PrivateImage v-for="f in m.filesUrl" :key="f" :path="f" />
          <div class="msg-actions">
            <button class="link-btn" @click="replyingTo = m">répondre</button>
            <template v-if="m.sender === auth.user?.id">
              <button class="link-btn" @click="startEdit(m)">éditer</button>
              <button class="link-btn" @click="remove(m)">suppr.</button>
            </template>
          </div>
        </template>
      </div>
    </div>

    <div v-if="replyingTo" class="reply-banner">
      réponse à « {{ replyingTo.content }} »
      <button class="link-btn" @click="replyingTo = null">×</button>
    </div>

    <form class="composer" @submit.prevent="send">
      <label class="attach">
        📎<input type="file" accept="image/*" hidden @change="onFile" />
      </label>
      <span v-if="pendingFile.length" class="muted">image prête</span>
      <input v-model="draft" class="input" placeholder="Message…" />
      <button class="btn">Envoyer</button>
    </form>
  </section>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 130px);
}
.chat-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}
.title {
  font-size: 20px;
  margin: 0;
}
.gh {
  color: var(--color-accent);
  margin-left: 8px;
}
.group-edit {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px;
}
.msg {
  max-width: 70%;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 8px 10px;
  background: var(--color-surface);
}
.msg.mine {
  align-self: flex-end;
  border-color: var(--color-accent);
}
.msg-author {
  font-size: 11px;
  color: var(--color-muted);
  margin: 0 0 2px;
}
.msg-reply {
  font-size: 11px;
  color: var(--color-muted);
  border-left: 2px solid var(--color-border);
  padding-left: 6px;
  margin: 0 0 4px;
}
.msg-content {
  margin: 0;
  white-space: pre-wrap;
}
.msg-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.reply-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 6px 10px;
  margin-top: 8px;
}
.composer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.attach {
  cursor: pointer;
  font-size: 18px;
}
.input {
  flex: 1;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: #f3f3f4;
  border-radius: 8px;
  padding: 10px;
  font: inherit;
}
.btn {
  border: none;
  background: var(--color-accent);
  color: #fff;
  border-radius: 8px;
  padding: 0 16px;
  cursor: pointer;
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  padding: 0;
  font-size: 12px;
}
.muted {
  color: var(--color-muted);
}
.error {
  color: #ef6d72;
}
</style>
