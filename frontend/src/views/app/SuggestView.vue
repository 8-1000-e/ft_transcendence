<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'

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
const campusId = ref('')
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
    error.value = (e as { message?: string }).message ?? 'Suggestion impossible'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="wrap">
    <h1 class="title">Suggérer une équipe</h1>
    <p class="sub">// entre un campus pour découvrir les équipes actives.</p>

    <div class="row">
      <input
        v-model="campusId"
        class="input"
        placeholder="campusId (ex. 31 = Angoulême)"
        @keyup.enter="search"
      />
      <button class="btn" :disabled="loading" @click="search">
        {{ loading ? 'Recherche…' : 'Chercher' }}
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="done && !teams.length" class="muted">Aucune équipe trouvée.</p>

    <div class="teams">
      <div v-for="t in teams" :key="t.teamId" class="team">
        <div class="team-head">
          <span class="team-name">Équipe · note {{ t.final_mark ?? '?' }}</span>
          <span class="team-n">{{ t.users.length }} membres</span>
        </div>
        <div class="members">
          <span
            v-for="u in t.users"
            :key="u.id"
            class="member"
            :title="`${u.name} (${u.login})${u.location ? ' · ' + u.location : ''}`"
          >
            <img v-if="u.ppurl" :src="u.ppurl" class="m-pp" alt="" />
            <span v-else class="m-av">{{ initials(u.name || u.login) }}</span>
          </span>
        </div>
        <div class="logins">
          <span v-for="u in t.users" :key="u.id" class="login">
            {{ u.login }}<span v-if="u.location" class="loc"> · {{ u.location }}</span>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.wrap {
  max-width: 620px;
}
.title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
  color: #f6f6f7;
}
.sub {
  margin: 0 0 22px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  color: #74747e;
}
.row {
  display: flex;
  gap: 10px;
  margin-bottom: 22px;
}
.input {
  flex: 1;
  height: 46px;
  padding: 0 14px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.035);
  color: #f3f3f4;
  font: inherit;
  font-size: 14.5px;
  outline: none;
}
.input:focus {
  border-color: #6e7bf2;
  box-shadow: 0 0 0 3px rgba(110, 123, 242, 0.2);
}
.btn {
  height: 46px;
  padding: 0 20px;
  border-radius: 11px;
  border: none;
  background: linear-gradient(180deg, #5e6cf0, #4a5fe8);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn:hover {
  filter: brightness(1.08);
}
.btn:disabled {
  opacity: 0.6;
}
.teams {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.team {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(17, 17, 21, 0.6);
  padding: 16px 18px;
}
.team-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.team-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  color: #dfe2ff;
}
.team-n {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #74747e;
}
.members {
  display: flex;
  margin-bottom: 10px;
}
.member {
  margin-right: -8px;
}
.m-pp,
.m-av {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #101014;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  object-fit: cover;
}
.m-av {
  background: linear-gradient(135deg, #3a3a52, #54547a);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #dfe2ff;
}
.logins {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
}
.login {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #9a9aa2;
}
.loc {
  color: #5c5c66;
}
.muted {
  color: #74747e;
}
.error {
  color: #ef6d72;
}
</style>
