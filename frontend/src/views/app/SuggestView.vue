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
  <section>
    <h1 class="title">Suggestions d'équipes</h1>
    <p class="muted">
      Projet <code>{{ projectId() }}</code> — entre l'ID de campus (ex. 31 pour
      Angoulême). Peut prendre quelques secondes (API 42).
    </p>

    <form class="row" @submit.prevent="search">
      <input v-model="campusId" class="input" placeholder="campusId" />
      <button class="btn" :disabled="loading">
        {{ loading ? 'Recherche…' : 'Chercher' }}
      </button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="done && !teams.length" class="muted">Aucune équipe trouvée.</p>

    <ul class="list">
      <li v-for="t in teams" :key="t.teamId" class="team">
        <p class="team-head">
          Équipe — note {{ t.final_mark ?? '?' }}
        </p>
        <ul class="members">
          <li v-for="u in t.users" :key="u.id" class="member">
            <img v-if="u.ppurl" :src="u.ppurl" class="pp" alt="" />
            <span>{{ u.name }} ({{ u.login }})</span>
            <span v-if="u.location" class="loc">📍 {{ u.location }}</span>
          </li>
        </ul>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.title {
  font-size: 22px;
  margin: 0 0 8px;
}
.row {
  display: flex;
  gap: 8px;
  margin: 12px 0 20px;
  max-width: 360px;
}
.input {
  flex: 1;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: #f3f3f4;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
}
.btn {
  border: none;
  background: var(--color-accent);
  color: #fff;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.team {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  background: var(--color-surface);
}
.team-head {
  margin: 0 0 8px;
  font-weight: 600;
}
.members {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.member {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pp {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}
.loc {
  color: var(--color-muted);
  font-size: 12px;
}
.muted {
  color: var(--color-muted);
}
.error {
  color: #ef6d72;
}
code {
  font-family: 'JetBrains Mono', monospace;
}
</style>
