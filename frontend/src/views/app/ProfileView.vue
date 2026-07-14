<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'
import Avatar from '@/components/Avatar.vue'
import ProfileActivity from '@/components/ProfileActivity.vue'
import type { Activity } from '@/types/api'

const auth = useAuthStore()
const router = useRouter()

const activity = ref<Activity>({ posts: [], comments: [] })
const activityLoading = ref(false)

const has42 = computed(() => !!auth.user?.has42)
const karma = computed(() => auth.user?.karma ?? 0)

function fmtDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const memberSince = computed(() => fmtDate(auth.user?.createdAt))
const handle = computed(() =>
  auth.user?.login
    ? '@' + auth.user.login
    : '@' + (auth.user?.email?.split('@')[0] ?? 'me'),
)

async function loadActivity() {
  if (!has42.value) return
  activityLoading.value = true
  try {
    activity.value = await api.get<Activity>(ROUTES.users.activity)
  } catch {
    /* activity is non-critical — leave the empty state showing */
  } finally {
    activityLoading.value = false
  }
}

async function logout() {
  await auth.logout()
  await router.push('/login')
}

onMounted(loadActivity)
</script>

<template>
  <section>
    <!-- ── Header ── -->
    <div class="prof-head">
      <Avatar
        class="av av-a prof-av"
        :user-id="auth.user?.id ?? ''"
        :name="auth.user?.name ?? ''"
        :size="84"
      />
      <div class="prof-main">
        <div class="prof-name-row">
          <h1 class="prof-name">{{ auth.user?.name }}</h1>
          <span v-if="has42" class="badge42">
            <span class="badge42-sq" style="width: 16px; height: 16px">42</span>
            {{ auth.user?.campus ?? $t('profile.verified') }}
          </span>
          <span v-else class="badge-guest">{{ $t('profile.emailAccount') }}</span>
        </div>
        <p class="prof-login">{{ handle }}</p>

        <div v-if="has42" class="prof-stats">
          <div class="prof-stat"><div class="v">{{ karma }}</div><div class="k">{{ $t('common.karma') }}</div></div>
          <div class="prof-stat"><div class="v">{{ activity.posts.length }}</div><div class="k">{{ $t('common.posts') }}</div></div>
          <div class="prof-stat"><div class="v">{{ activity.comments.length }}</div><div class="k">{{ $t('common.comments') }}</div></div>
          <div v-if="memberSince" class="prof-stat"><div class="v">{{ memberSince }}</div><div class="k">{{ $t('profile.memberSince') }}</div></div>
        </div>
      </div>

      <div class="prof-actions">
        <RouterLink :to="{ name: 'settings' }" class="pbtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" /></svg>
          {{ $t('profile.settings') }}
        </RouterLink>
        <button class="pbtn" @click="logout">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /><path d="M10 8l-4 4 4 4M6 12h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
          {{ $t('profile.logout') }}
        </button>
      </div>
    </div>

    <!-- ── Non-42: read-only browser, no activity ── -->
    <div v-if="!has42" class="empty-state">
      <p>{{ $t('profile.guestBlurb') }}</p>
      <RouterLink :to="{ name: 'settings' }" class="pbtn primary" style="display: inline-flex">
        <span class="badge42-sq" style="width: 18px; height: 18px">42</span>{{ $t('common.linkYour42') }}
      </RouterLink>
    </div>

    <!-- ── 42: activity ── -->
    <template v-else>
      <p v-if="activityLoading" class="muted" style="padding: 20px 6px">{{ $t('profile.loadingActivity') }}</p>
      <ProfileActivity v-else :posts="activity.posts" :comments="activity.comments" />
    </template>
  </section>
</template>
