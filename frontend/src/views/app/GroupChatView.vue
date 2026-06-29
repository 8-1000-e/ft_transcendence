<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'
import type { Group, Message } from '@/types/api'

const route = useRoute()
const auth = useAuthStore()

const group = ref<Group | null>(null)
const messages = ref<Message[]>([])
const draft = ref('')
const loading = ref(false)
const error = ref('')
const listEl = ref<HTMLElement | null>(null)

function groupId(): string {
  return route.params.groupId as string
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [g, m] = await Promise.all([
      api.get<Group>(ROUTES.groups.byId(groupId())),
      api.get<Message[]>(ROUTES.groups.messages(groupId())),
    ])
    group.value = g
    messages.value = m
    await nextTick()
    listEl.value?.scrollTo({ top: listEl.value.scrollHeight })
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

async function send() {
  if (!draft.value.trim()) return
  const content = draft.value
  draft.value = ''
  try {
    await api.post(ROUTES.groups.sendMessage(groupId()), { content })
    messages.value = await api.get<Message[]>(ROUTES.groups.messages(groupId()))
    await nextTick()
    listEl.value?.scrollTo({ top: listEl.value.scrollHeight })
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Envoi impossible'
  }
}

watch(() => route.params.groupId, load, { immediate: true })
</script>

<template>
  <section class="chat">
    <header class="chat-head">
      <h1 class="title">{{ group?.groupName ?? 'Groupe' }}</h1>
      <span class="muted">{{ group?.projectName }}</span>
    </header>

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
        <p class="msg-content">{{ m.content }}</p>
      </div>
    </div>

    <form class="composer" @submit.prevent="send">
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
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.title {
  font-size: 20px;
  margin: 0;
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
.msg-content {
  margin: 0;
  white-space: pre-wrap;
}
.composer {
  display: flex;
  gap: 8px;
  margin-top: 12px;
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
.muted {
  color: var(--color-muted);
}
.error {
  color: #ef6d72;
}
</style>
