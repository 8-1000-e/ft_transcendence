import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import type { Group, ProjectRef } from '@/types/api'

// The 42 team sync (syncUserTeam) runs fire-and-forget after login, so /groups
// is initially empty/partial. Poll it until the count settles (STABLE_HITS
// non-empty reads in a row) or an attempt cap is hit — generous because the 42
// API is slow, cheap because each poll is a local GET /groups.
const POLL_INTERVAL = 3000
const MAX_ATTEMPTS = 20
const STABLE_HITS = 2

export const useGroupsStore = defineStore('groups', () => {
  const groups = ref<Group[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  const syncing = ref(false)
  const error = ref('')

  let pollTimer: ReturnType<typeof setTimeout> | null = null
  // Bumped on every start/stop so an in-flight tick suspended at `await` is
  // cancelled (checked after the await) — otherwise a logout mid-tick would
  // re-populate the previous user's groups and resurrect the timer.
  let pollGen = 0
  let attempts = 0
  let lastCount = -1
  let stable = 0

  function fetchList(): Promise<Group[]> {
    return api.get<Group[]>(ROUTES.groups.list)
  }

  function stopPoll() {
    pollGen++
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
    syncing.value = false
  }

  async function tick(gen: number) {
    if (gen !== pollGen) return
    attempts++
    let list: Group[] | null = null
    try {
      list = await fetchList()
    } catch {
      /* transient error → neutral: don't touch stability, just keep polling */
    }
    if (gen !== pollGen) return // cancelled during the await (e.g. logout)
    if (list) {
      groups.value = list
      loaded.value = true
      const count = list.length
      // A run of zeros is NOT "settled" — the crawl may not have written its
      // first row yet; only a stable, non-empty count ends the poll early.
      stable = count > 0 && count === lastCount ? stable + 1 : count > 0 ? 1 : 0
      lastCount = count
    }
    if (stable >= STABLE_HITS || attempts >= MAX_ATTEMPTS) stopPoll()
    else pollTimer = setTimeout(() => tick(gen), POLL_INTERVAL)
  }

  function startPoll() {
    stopPoll() // idempotent — bumps pollGen, so only this loop survives
    const gen = pollGen
    attempts = 0
    stable = 0
    lastCount = groups.value.length
    syncing.value = true
    pollTimer = setTimeout(() => tick(gen), POLL_INTERVAL)
  }

  async function fetchGroups() {
    loading.value = true
    error.value = ''
    try {
      groups.value = await fetchList()
      loaded.value = true
      startPoll()
    } catch {
      error.value = 'Failed to load groups'
    } finally {
      loading.value = false
    }
  }

  // Reset cached state on logout so a new login doesn't inherit the previous
  // groups; stopPoll() first so no in-flight tick can write after the reset.
  function reset() {
    stopPoll()
    groups.value = []
    loaded.value = false
    loading.value = false
    error.value = ''
  }

  // Keep the shared list in sync after an edit, without refetching (a fetchGroups()
  // here would restart the sync-poll and flash the rail's loading state).
  function upsert(g: Group) {
    const i = groups.value.findIndex((x) => x.id === g.id)
    if (i >= 0) groups.value[i] = g
    else groups.value.push(g)
  }

  function projects(): ProjectRef[] {
    const seen = new Map<string, string>()
    for (const g of groups.value) {
      if (!seen.has(g.projectId)) {
        seen.set(g.projectId, g.projectName ?? g.projectId)
      }
    }
    return [...seen].map(([projectId, projectName]) => ({ projectId, projectName }))
  }

  return { groups, loaded, loading, syncing, error, fetchGroups, projects, reset, upsert }
})
