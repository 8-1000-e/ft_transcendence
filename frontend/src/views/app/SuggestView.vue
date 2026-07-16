<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'
import Avatar from '@/components/Avatar.vue'

interface SuggestUser {
  id: string
  login: string
  name: string | null
  ppurl: string | null
  location: string | null
  last_connexion: string | null
}
interface SuggestTeam {
  id: string
  isGroupe: boolean
  final_mark?: number
  marked_at?: string
  users: SuggestUser[]
}

const route = useRoute()
const auth = useAuthStore()

const projName = ref('')
const teams = ref<SuggestTeam[]>([])
const loading = ref(false)
const forbidden = ref(false)
const error = ref('')

const projectId = computed(() => route.params.projectId as string)
const campus = computed(() => auth.user?.campus ?? '')

function teamOnline(t: SuggestTeam): number {
  return t.users.some((u) => u.location) ? 1 : 0
}
// Online mentors first — they can help right now.
const sortedTeams = computed(() =>
  [...teams.value].sort((a, b) => teamOnline(b) - teamOnline(a)),
)
const onlineCount = computed(
  () => teams.value.flatMap((t) => t.users).filter((u) => u.location).length,
)

async function load() {
  loading.value = true
  error.value = ''
  forbidden.value = false
  teams.value = []
  api
    .get<{ name: string }>(ROUTES.posts.project(projectId.value))
    .then((m) => (projName.value = m.name))
    .catch(() => {})
  try {
    teams.value = await api.get<SuggestTeam[]>(
      ROUTES.suggest.forProject(projectId.value),
    )
  } catch (e) {
    const err = e as { statusCode?: number; message?: string }
    if (err.statusCode === 403) forbidden.value = true
    else error.value = err.message ?? 'Could not load mentors'
  } finally {
    loading.value = false
  }
}

watch(projectId, load, { immediate: true })
</script>

<template>
  <section class="set-wrap">
    <RouterLink :to="{ name: 'project', params: { projectId } }" class="back-link">
      <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" /></svg>
      {{ projName || projectId }}
    </RouterLink>

    <h1 class="h1">{{ $t('browse.suggest.title', { name: projName || $t('browse.projectWord') }) }}</h1>
    <p class="eyebrow">
      // {{ $t('browse.suggest.sub') }}{{ campus ? ' · ' + campus : '' }}
      <span v-if="onlineCount" class="online-now">· {{ onlineCount }} {{ $t('browse.onlineNow') }}</span>
    </p>

    <div v-if="forbidden" class="lock">
      <span class="lock-mark"><svg aria-hidden="true" focusable="false" width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg></span>
      <h2>{{ $t('browse.suggest.lockTitle') }}</h2>
      <p>{{ $t('browse.suggest.lockBody') }}</p>
      <RouterLink :to="{ name: 'settings' }" class="pbtn primary"><span class="badge42-sq" style="width: 18px; height: 18px">42</span>{{ $t('common.linkYour42') }}</RouterLink>
    </div>

    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else-if="loading" class="muted">{{ $t('browse.suggest.loading') }}</p>
    <p v-else-if="!teams.length" class="muted">
      {{ $t('browse.suggest.empty') }}
    </p>

    <div v-else class="feed">
      <div v-for="t in sortedTeams" :key="t.id" class="card">
        <div class="c-head">
          <span class="tag-mark" v-if="t.final_mark != null">{{ t.final_mark }}%</span>
          <span class="mono-dim">{{ t.isGroupe ? t.users.length + ' ' + $t('browse.students') : $t('browse.solo') }}</span>
          <span v-if="teamOnline(t)" class="online-badge">● {{ $t('browse.onlineNow') }}</span>
        </div>
        <div class="mentors">
          <div v-for="u in t.users" :key="u.id" class="mentor" :class="{ 'is-online': u.location }">
            <span class="av-wrap">
              <Avatar
                class="av av-c"
                style="width: 38px; height: 38px; border-radius: 11px"
                :pfp-url="u.ppurl ?? undefined"
                :name="u.name || u.login"
                :size="38"
              />
              <span v-if="u.location" class="online-dot" :title="$t('common.online') + ' · ' + u.location"></span>
            </span>
            <a
              class="mentor-main"
              :href="`https://profile.intra.42.fr/users/${u.login}`"
              target="_blank"
              rel="noopener noreferrer"
              style="text-decoration: none"
            >
              <div class="mentor-name">{{ u.name || u.login }} <span style="color: var(--dim); font-size: 11px">↗</span></div>
              <div class="mentor-meta">
                <span class="mono">{{ u.login }}</span>
                <span v-if="u.location" class="online">{{ $t('common.online') }} · {{ u.location }}</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
  text-decoration: none;
  margin-bottom: 14px;
}
.back-link:hover {
  color: var(--accent-2);
}
.tag-mark {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--up);
  border: 1px solid rgba(94, 224, 138, 0.35);
  background: rgba(94, 224, 138, 0.08);
  padding: 2px 8px;
  border-radius: 999px;
}
.mono-dim {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
}
.mentors {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 12px;
}
.mentor {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 2px;
}
.mentor-main {
  flex: 1;
  min-width: 0;
}
.mentor-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.mentor-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}
.mono {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
}
.online {
  font-size: 11px;
  color: var(--up);
  font-weight: 600;
}
.online-now {
  color: var(--up);
}
.online-badge {
  margin-left: auto;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--up);
  border: 1px solid rgba(94, 224, 138, 0.35);
  background: rgba(94, 224, 138, 0.08);
  padding: 2px 8px;
  border-radius: 999px;
}
.mentor.is-online {
  background: rgba(94, 224, 138, 0.04);
  border-radius: 10px;
}
</style>
