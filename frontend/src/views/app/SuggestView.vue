<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'

interface SuggestUser {
  id: string
  login: string
  name: string
  ppurl: string | null
  location: string | null
}
interface SuggestTeam {
  teamId: string
  final_mark?: number
  users: SuggestUser[]
}

const route = useRoute()
const auth = useAuthStore()
const campusId = ref(auth.user?.campusId ?? '')
const teams = ref<SuggestTeam[]>([])
const loading = ref(false)
const error = ref('')
const done = ref(false)

function projectId(): string {
  return route.params.projectId as string
}

function initials(n?: string | null): string {
  if (!n) return '??'
  return n.trim().slice(0, 2).toUpperCase()
}

async function search() {
  if (!campusId.value) return
  loading.value = true
  error.value = ''
  done.value = false
  try {
    teams.value = await api.get<SuggestTeam[]>(
      ROUTES.suggest.byProject(projectId(), campusId.value),
    )
    done.value = true
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Could not load suggestions'
  } finally {
    loading.value = false
  }
}

// Auto-load recommendations as soon as we have both a project and a campus.
function maybeSearch() {
  if (projectId() && campusId.value) search()
}

onMounted(maybeSearch)

// Prefill the campus from auth as soon as it becomes available, then load.
watch(
  () => auth.user?.campusId,
  (id) => {
    if (id && !campusId.value) {
      campusId.value = id
      maybeSearch()
    }
  },
)
</script>

<template>
  <section class="wrap">
    <h1 class="title">Suggested teams</h1>
    <p class="sub mono">// teams working on this project at your campus.</p>

    <div class="field campus">
      <label class="label" for="campus-id">Campus</label>
      <div class="row">
        <input
          id="campus-id"
          v-model="campusId"
          class="input"
          placeholder="campus id"
          @keyup.enter="search"
        />
        <button class="btn" :disabled="loading" @click="search">
          {{ loading ? 'Searching…' : 'Search' }}
        </button>
      </div>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-if="done && !teams.length" class="muted empty">No teams found.</p>

    <div class="teams">
      <article v-for="t in teams" :key="t.teamId" class="card card-pad team">
        <header class="team-head">
          <span class="team-name">Team · rating <span class="badge">{{ t.final_mark ?? '?' }}</span></span>
          <span class="team-n mono">{{ t.users.length }} members</span>
        </header>

        <div class="members">
          <span
            v-for="u in t.users"
            :key="u.id"
            class="member"
            :title="`${u.name} (${u.login})${u.location ? ' · ' + u.location : ''}`"
          >
            <img v-if="u.ppurl" :src="u.ppurl" class="avatar m-av" alt="" />
            <span v-else class="avatar m-av">{{ initials(u.name || u.login) }}</span>
          </span>
        </div>

        <ul class="logins">
          <li v-for="u in t.users" :key="u.id" class="login-row">
            <span class="login mono">{{ u.login }}</span>
            <span v-if="u.location" class="loc mono">· {{ u.location }}</span>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style scoped>
.wrap {
  max-width: 620px;
}
.title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
  color: var(--color-text);
}
.sub {
  margin: 0 0 24px;
  font-size: 12.5px;
  color: var(--color-muted);
}
.campus {
  margin-bottom: 24px;
}
.row {
  display: flex;
  gap: 10px;
}
.row .input {
  flex: 1;
}
.empty {
  font-size: 13.5px;
}
.teams {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}
.team-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.team-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}
.team-n {
  font-size: 11px;
  color: var(--color-muted);
}
.members {
  display: flex;
  margin-bottom: 14px;
}
.member {
  margin-right: -8px;
}
.m-av {
  width: 30px;
  height: 30px;
  font-size: 10px;
  border: 2px solid var(--color-surface);
  object-fit: cover;
}
.logins {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.login-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
}
.login {
  color: var(--color-text-dim);
}
.loc {
  color: var(--color-muted);
}
</style>
