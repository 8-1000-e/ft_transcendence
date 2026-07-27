<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import Avatar from '@/components/Avatar.vue'
import type { FriendView } from '@/types/api'

const friends = ref<FriendView[]>([])
const requests = ref<FriendView[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [f, r] = await Promise.all([
      api.get<FriendView[]>(ROUTES.friends.list),
      api.get<FriendView[]>(ROUTES.friends.requests),
    ])
    friends.value = f
    requests.value = r
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed to load friends'
  } finally {
    loading.value = false
  }
}

async function accept(u: FriendView) {
  error.value = ''
  try {
    await api.post(ROUTES.friends.accept(u.id))
    requests.value = requests.value.filter((x) => x.id !== u.id)
    // Re-fetch so the new friend lands in the online-first ordering.
    friends.value = await api.get<FriendView[]>(ROUTES.friends.list)
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed to accept'
  }
}

async function decline(u: FriendView) {
  error.value = ''
  try {
    await api.del(ROUTES.friends.remove(u.id))
    requests.value = requests.value.filter((x) => x.id !== u.id)
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed to decline'
  }
}

async function remove(u: FriendView) {
  error.value = ''
  try {
    await api.del(ROUTES.friends.remove(u.id))
    friends.value = friends.value.filter((x) => x.id !== u.id)
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed to remove'
  }
}

onMounted(load)
</script>

<template>
  <section>
    <h1 class="h1">{{ $t('friends.title') }}</h1>
    <p class="eyebrow">// {{ $t('friends.sub') }}</p>

    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <p v-if="loading" class="muted">{{ $t('common.loading') }}</p>

    <template v-else>
      <template v-if="requests.length">
        <div class="fr-head">
          <span class="fr-title">{{ $t('friends.requests') }}</span>
          <span class="fr-count">{{ requests.length }}</span>
        </div>
        <div class="fr-list">
          <div v-for="u in requests" :key="u.id" class="fr-row">
            <RouterLink :to="{ name: 'user', params: { id: u.id } }" class="fr-user">
              <span class="av-wrap">
                <Avatar class="av av-c" :user-id="u.id" :name="u.name" :size="40" />
                <span v-if="u.online || u.location" class="online-dot" :title="u.location ?? $t('common.online')"></span>
              </span>
              <span class="fr-main">
                <span class="fr-name">{{ u.name }}</span>
                <span class="fr-meta">{{ u.login ? '@' + u.login : '' }}<template v-if="u.campus"> · {{ u.campus }}</template></span>
              </span>
            </RouterLink>
            <div class="fr-actions">
              <button class="pbtn primary" @click="accept(u)">{{ $t('friends.accept') }}</button>
              <button class="pbtn" @click="decline(u)">{{ $t('friends.decline') }}</button>
            </div>
          </div>
        </div>
      </template>

      <div class="fr-head">
        <span class="fr-title">{{ $t('friends.all') }}</span>
        <span class="fr-count">{{ friends.length }}</span>
      </div>
      <p v-if="!friends.length" class="muted">
        {{ $t('friends.empty') }}
      </p>
      <div v-else class="fr-list">
        <div v-for="u in friends" :key="u.id" class="fr-row">
          <RouterLink :to="{ name: 'user', params: { id: u.id } }" class="fr-user">
            <span class="av-wrap">
              <Avatar class="av av-c" :user-id="u.id" :name="u.name" :size="40" />
              <span v-if="u.online || u.location" class="online-dot" :title="u.location ?? $t('common.online')"></span>
            </span>
            <span class="fr-main">
              <span class="fr-name">{{ u.name }}</span>
              <span class="fr-meta">
                <!-- On campus → show the seat instead of a bare "online". -->
                <span v-if="u.location" class="on">{{ u.location }}</span>
                <span v-else :class="u.online ? 'on' : 'off'">{{ u.online ? $t('common.online') : $t('common.offline') }}</span>
                <template v-if="u.campus"> · {{ u.campus }}</template>
              </span>
            </span>
          </RouterLink>
          <div class="fr-actions">
            <button class="pbtn" :title="$t('common.remove')" @click="remove(u)">{{ $t('common.remove') }}</button>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.fr-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 24px 0 10px;
}
.fr-title {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.fr-count {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-2);
}
.fr-list { display: flex; flex-direction: column; gap: 6px; }
.fr-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}
.fr-user {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
}
.fr-main { display: flex; flex-direction: column; min-width: 0; }
.fr-name { font-size: 14px; font-weight: 600; color: var(--text); }
.fr-user:hover .fr-name { color: var(--accent-2); }
.fr-meta {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--muted);
}
.fr-meta .on { color: var(--up); font-weight: 700; }
.fr-meta .off { color: var(--dim); }
.fr-actions { display: flex; gap: 8px; flex-shrink: 0; }
</style>
