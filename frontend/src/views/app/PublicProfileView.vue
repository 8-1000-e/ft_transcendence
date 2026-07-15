<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n'
import Avatar from '@/components/Avatar.vue'
import ProfileActivity from '@/components/ProfileActivity.vue'
import type { Activity, FriendStatus, PublicUser } from '@/types/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()
const user = ref<PublicUser | null>(null)
const activity = ref<Activity>({ posts: [], comments: [] })
const loading = ref(false)
const error = ref('')

const friendStatus = ref<FriendStatus | null>(null)
const friendBusy = ref(false)
// Friending is 42-only and never targets yourself.
const canFriend = computed(
  () => !!auth.user?.has42 && !!user.value && user.value.id !== auth.user?.id,
)

async function loadStatus(id: string) {
  friendStatus.value = null
  if (!auth.user?.has42 || id === auth.user?.id) return
  try {
    const r = await api.get<{ status: FriendStatus }>(ROUTES.friends.status(id))
    if (id === route.params.id) friendStatus.value = r.status
  } catch {
    /* leave the button hidden on failure */
  }
}

async function doFriend(action: 'request' | 'accept' | 'remove') {
  const id = route.params.id as string
  friendBusy.value = true
  error.value = ''
  try {
    if (action === 'request') {
      // request() may auto-accept (if they already requested us) → trust its status.
      const r = await api.post<{ status: FriendStatus }>(ROUTES.friends.request(id))
      friendStatus.value = r.status
    } else if (action === 'accept') {
      await api.post(ROUTES.friends.accept(id))
      friendStatus.value = 'friends'
    } else {
      await api.del(ROUTES.friends.remove(id))
      friendStatus.value = 'none'
    }
  } catch (e) {
    error.value = (e as { message?: string }).message ?? t('profile.actionFailed')
  } finally {
    friendBusy.value = false
  }
}

// @handle = real 42 login: present only for 42 viewers, hidden for anonymised non-42 viewers.
const handle = computed(() => (user.value?.login ? '@' + user.value.login : ''))
const memberSince = computed(() => {
  const iso = user.value?.createdAt
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
})

async function load() {
  const id = route.params.id as string
  loading.value = true
  error.value = ''
  user.value = null
  activity.value = { posts: [], comments: [] }
  // Activity is public forum content and non-critical — don't fail the page on it.
  api
    .get<Activity>(ROUTES.users.activityById(id))
    .then((a) => {
      if (id === route.params.id) activity.value = a
    })
    .catch(() => {})
  try {
    user.value = await api.get<PublicUser>(ROUTES.users.byId(id))
    void loadStatus(id)
  } catch (e) {
    error.value = (e as { message?: string }).message ?? t('profile.notFound')
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, load, { immediate: true })
</script>

<template>
  <section>
    <button class="back-link" @click="router.back()">
      <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" /></svg>
      {{ $t('common.back') }}
    </button>

    <p v-if="loading" class="muted" role="status">{{ $t('common.loading') }}</p>
    <p v-if="error" class="err" role="alert">{{ error }}</p>

    <template v-if="user">
      <div class="prof-head">
        <span class="av-wrap" style="z-index: 1">
          <Avatar class="av av-a prof-av" :user-id="user.id" :name="user.name" :size="84" />
          <span v-if="user.online" class="online-dot"></span>
        </span>
        <div class="prof-main">
          <div class="prof-name-row">
            <h1 class="prof-name">{{ user.name }}</h1>
            <span v-if="user.campus" class="badge42">
              <span class="badge42-sq" style="width: 16px; height: 16px">42</span>{{ user.campus }}
            </span>
          </div>
          <p class="prof-login">{{ handle }}</p>
          <div class="prof-stats">
            <div class="prof-stat"><div class="v">{{ user.karma ?? 0 }}</div><div class="k">{{ $t('common.karma') }}</div></div>
            <div class="prof-stat"><div class="v">{{ activity.posts.length }}</div><div class="k">{{ $t('common.posts') }}</div></div>
            <div class="prof-stat"><div class="v">{{ activity.comments.length }}</div><div class="k">{{ $t('common.comments') }}</div></div>
            <div v-if="memberSince" class="prof-stat"><div class="v">{{ memberSince }}</div><div class="k">{{ $t('profile.memberSince') }}</div></div>
          </div>
        </div>

        <div v-if="canFriend && friendStatus" class="prof-actions">
          <button v-if="friendStatus === 'none'" class="pbtn primary" :disabled="friendBusy" @click="doFriend('request')">{{ $t('friends.add') }}</button>
          <button v-else-if="friendStatus === 'pending_out'" class="pbtn" :disabled="friendBusy" @click="doFriend('remove')">{{ $t('friends.cancel') }}</button>
          <template v-else-if="friendStatus === 'pending_in'">
            <button class="pbtn primary" :disabled="friendBusy" @click="doFriend('accept')">{{ $t('friends.accept') }}</button>
            <button class="pbtn" :disabled="friendBusy" @click="doFriend('remove')">{{ $t('friends.decline') }}</button>
          </template>
          <button v-else-if="friendStatus === 'friends'" class="pbtn" :title="$t('profile.removeFriend')" :disabled="friendBusy" @click="doFriend('remove')">{{ $t('friends.friends') }}</button>
        </div>
      </div>

      <ProfileActivity :posts="activity.posts" :comments="activity.comments" />
    </template>
  </section>
</template>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
  margin-bottom: 14px;
}
.back-link:hover {
  color: var(--accent-2);
}
</style>
