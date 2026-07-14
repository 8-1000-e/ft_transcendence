import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import type { Group, ProjectRef } from '@/types/api'

export const useGroupsStore = defineStore('groups', () => {
  const groups = ref<Group[]>([])
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
      error.value = 'Failed to load groups'
    } finally {
      loading.value = false
    }
  }

  /**
   * Wipe all cached state back to its initial values. Called from the auth
   * store's clear()/logout flow so a newly logged-in account never inherits the
   * previous session's groups/projects (the "must Cmd+R when switching
   * accounts" bug).
   */
  function reset() {
    groups.value = []
    loaded.value = false
    loading.value = false
    error.value = ''
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

  return { groups, loaded, loading, error, fetchGroups, projects, reset }
})
