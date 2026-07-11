import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import type { Group, ProjectRef } from '@/types/api'

export const useGroupsStore = defineStore('groups', () => {
  const groups = ref<Group[]>([])
  const unread = ref<Record<string, number>>({})
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref('')

  async function fetchGroups() {
    loading.value = true
    error.value = ''
    try {
      groups.value = await api.get<Group[]>(ROUTES.groups.list)
      loaded.value = true
    } catch {
      error.value = 'Impossible de charger les groupes'
    } finally {
      loading.value = false
    }
  }

  async function fetchUnread() {
    try {
      unread.value = await api.get<Record<string, number>>(ROUTES.groups.unread)
    } catch {
      /* ignore */
    }
  }

  async function markRead(groupId: string) {
    try {
      await api.post(ROUTES.groups.read(groupId))
      await fetchUnread()
    } catch {
      /* ignore */
    }
  }

  function totalUnread(): number {
    return Object.values(unread.value).reduce((a, b) => a + b, 0)
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

  return {
    groups,
    unread,
    loaded,
    loading,
    error,
    fetchGroups,
    fetchUnread,
    markRead,
    totalUnread,
    projects,
  }
})
