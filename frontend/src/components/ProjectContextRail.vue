<script setup lang="ts">
// Per-project context rail (named router-view `rail`): mentors (42-gated Suggest), best posters, latest posts.
// Panels degrade gracefully — a not-yet-live endpoint yields an empty message, never fabricated rows.
import { computed, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'
import { useGroupsStore } from '@/stores/groups'
import { useI18n } from '@/i18n'
import Avatar from '@/components/Avatar.vue'
import type { Group, Page, Post, Poster } from '@/types/api'

interface Mentor {
  id: string
  login: string
  name: string | null
  ppurl: string | null
  location: string | null
  final_mark?: number
}
interface SuggestTeam {
  final_mark?: number
  users: {
    id: string
    login: string
    name: string | null
    ppurl: string | null
    location: string | null
  }[]
}

const route = useRoute()
const auth = useAuthStore()
const groups = useGroupsStore()
const { t } = useI18n()

const projectId = ref('')
const projectName = ref('')
const posters = ref<Poster[]>([])
const latest = ref<Post[]>([])
const mentors = ref<Mentor[]>([])
const mentorsLoading = ref(false)
const loading = ref(false)

const canSuggest = computed(() => !!auth.user?.has42)

function fmtTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return t('forum.now')
  if (mins < 60) return `${mins}m`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h`
  const days = Math.round(h / 24)
  return `${days}d`
}

function nameFromGroups(id: string): string {
  return groups.projects().find((p) => p.projectId === id)?.projectName ?? id
}

async function resolveProject(): Promise<void> {
  if (route.name === 'group') {
    const g = await api.get<Group>(ROUTES.groups.byId(route.params.groupId as string))
    projectId.value = g.projectId
    projectName.value = g.projectName ?? nameFromGroups(g.projectId)
  } else {
    const pid = route.params.projectId as string
    projectId.value = pid
    projectName.value = nameFromGroups(pid)
    // Resolve the real name for a non-member viewer (groups won't have it).
    const meta = await api
      .get<{ name: string }>(ROUTES.posts.project(pid))
      .catch(() => null)
    if (meta?.name && pid === projectId.value) projectName.value = meta.name
  }
}

// Mentors hit the live 42 API — load them separately (non-blocking) so their latency never stalls the cheap panels.
async function loadMentors(pid: string): Promise<void> {
  if (!canSuggest.value) {
    mentors.value = []
    return
  }
  mentorsLoading.value = true
  try {
    const teams = await api.get<SuggestTeam[]>(ROUTES.suggest.forProject(pid))
    if (pid !== projectId.value) return
    mentors.value = teams
      .flatMap((t) => t.users.map((u) => ({ ...u, final_mark: t.final_mark })))
      // Currently-online mentors first — they can help right now.
      .sort((a, b) => Number(!!b.location) - Number(!!a.location))
      .slice(0, 5)
  } catch {
    if (pid === projectId.value) mentors.value = []
  } finally {
    if (pid === projectId.value) mentorsLoading.value = false
  }
}

async function load(): Promise<void> {
  loading.value = true
  posters.value = []
  latest.value = []
  mentors.value = []
  try {
    await resolveProject()
    const pid = projectId.value
    void loadMentors(pid)
    const [p, l] = await Promise.all([
      api.get<Poster[]>(ROUTES.posts.posters(pid)).catch(() => [] as Poster[]),
      api
        .get<Page<Post>>(`${ROUTES.posts.listByProject(pid)}?limit=4`)
        .then((page) => page.items)
        .catch(() => [] as Post[]),
    ])
    // Ignore a response for a route we already navigated away from.
    if (pid !== projectId.value) return
    posters.value = p
    latest.value = l
  } finally {
    loading.value = false
  }
}

watch(
  () => [route.name, route.params.projectId, route.params.groupId],
  load,
  { immediate: true },
)
</script>

<template>
  <div>
    <div v-if="canSuggest" class="panel">
      <p class="panel-title">{{ $t('forum.bestStudents', { name: projectName }) }}</p>
      <p class="panel-sub">// {{ $t('forum.whoToAsk') }}</p>

      <template v-if="mentors.length">
        <a
          v-for="m in mentors"
          :key="m.id"
          class="srow"
          :href="`https://profile.intra.42.fr/users/${m.login}`"
          target="_blank"
          rel="noopener noreferrer"
          :title="$t('forum.onIntra', { name: m.name || m.login })"
        >
          <span class="av-wrap">
            <Avatar
              class="av av-c"
              style="width: 34px; height: 34px; border-radius: 9px"
              :pfp-url="m.ppurl ?? undefined"
              :name="m.name || m.login"
              :size="34"
            />
            <span v-if="m.location" class="online-dot" :title="$t('common.online') + ' · ' + m.location"></span>
          </span>
          <div class="srow-main">
            <div class="srow-name">{{ m.name || m.login }} <span class="ext">↗</span></div>
            <div class="srow-meta">
              <span v-if="m.final_mark != null" class="ok">{{ m.final_mark }}%</span>
              <span v-if="m.location" class="on"> · {{ $t('common.online') }}</span>
            </div>
          </div>
        </a>
        <RouterLink
          v-if="projectId"
          :to="{ name: 'suggest', params: { projectId } }"
          class="see-all"
        >{{ $t('forum.seeAllMentors') }} →</RouterLink>
      </template>

      <p v-else-if="mentorsLoading" class="panel-empty">{{ $t('forum.findingMentors') }}</p>
      <p v-else class="panel-empty">{{ $t('forum.noTopStudents') }}</p>
    </div>

    <div class="panel">
      <p class="panel-title">{{ $t('forum.bestPosters', { name: projectName }) }}</p>
      <p class="panel-sub">// {{ $t('forum.mostHelpful') }}</p>
      <template v-if="posters.length">
        <RouterLink
          v-for="p in posters"
          :key="p.writer"
          :to="{ name: 'user', params: { id: p.writer } }"
          class="srow"
        >
          <Avatar class="av av-c" :user-id="p.writer" :name="p.user?.name ?? '??'" :size="34" />
          <div class="srow-main">
            <div class="srow-name">{{ p.user?.name ?? $t('forum.anonymous') }}</div>
          </div>
          <span class="pcount">{{ p.count }}</span>
        </RouterLink>
      </template>
      <p v-else class="panel-empty">{{ $t('forum.noPostsHere') }}</p>
    </div>

    <div class="panel">
      <p class="panel-title">{{ $t('forum.latestIn', { name: projectName }) }}</p>
      <div class="panel-divider"></div>
      <template v-if="latest.length">
        <RouterLink
          v-for="p in latest"
          :key="p.id"
          :to="{ name: 'post', params: { postId: p.id }, query: { projectId } }"
          class="lrow"
        >
          <Avatar class="av av-d" :user-id="p.writer" :name="p.user?.name ?? '??'" :size="30" />
          <div class="lrow-main">
            <div class="lrow-title">{{ p.title || p.content }}</div>
            <div class="lrow-meta">{{ p.user?.name ?? $t('forum.anonymous') }} · {{ fmtTime(p.postedAt) }}</div>
          </div>
        </RouterLink>
      </template>
      <p v-else-if="loading" class="panel-empty">{{ $t('common.loading') }}</p>
      <p v-else class="panel-empty">{{ $t('forum.noPostsHere') }}</p>
    </div>
  </div>
</template>
