import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }))

import { api } from '@/api/client'
import { useGroupsStore } from './groups'
import type { Group } from '@/types/api'

const get = api.get as unknown as ReturnType<typeof vi.fn>
const post = api.post as unknown as ReturnType<typeof vi.fn>

function group(over: Partial<Group>): Group {
  return {
    id: 'x',
    groupName: 'G',
    githubLink: null,
    projectId: 'p',
    projectName: 'proj',
    groupCampus: null,
    usersId: [],
    ...over,
  }
}

describe('groups store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('derived getters', () => {
    it('totalUnread sums the per-group counts', () => {
      const s = useGroupsStore()
      s.unread = { g1: 2, g2: 5, g3: 1 }
      expect(s.totalUnread()).toBe(8)
    })

    it('totalUnread is 0 when there is nothing unread', () => {
      expect(useGroupsStore().totalUnread()).toBe(0)
    })

    it('projects() derives a de-duplicated project list by projectId', () => {
      const s = useGroupsStore()
      s.groups = [
        group({ id: 'a', projectId: 'p1', projectName: 'cub3d' }),
        group({ id: 'b', projectId: 'p1', projectName: 'cub3d' }),
        group({ id: 'c', projectId: 'p2', projectName: 'ft_irc' }),
      ]
      expect(s.projects()).toEqual([
        { projectId: 'p1', projectName: 'cub3d' },
        { projectId: 'p2', projectName: 'ft_irc' },
      ])
    })

    it('projects() falls back to the projectId when the name is missing', () => {
      const s = useGroupsStore()
      s.groups = [group({ id: 'a', projectId: 'p9', projectName: null })]
      expect(s.projects()).toEqual([{ projectId: 'p9', projectName: 'p9' }])
    })
  })

  describe('fetchGroups', () => {
    it('loads the groups and flips loaded/loading', async () => {
      const list = [group({ id: 'a' })]
      get.mockResolvedValueOnce(list)
      const s = useGroupsStore()

      await s.fetchGroups()

      expect(get).toHaveBeenCalledWith('/groups')
      expect(s.groups).toEqual(list)
      expect(s.loaded).toBe(true)
      expect(s.loading).toBe(false)
      expect(s.error).toBe('')
    })

    it('records an error and stops loading on failure', async () => {
      get.mockRejectedValueOnce(new Error('down'))
      const s = useGroupsStore()

      await s.fetchGroups()

      expect(s.error).not.toBe('')
      expect(s.loading).toBe(false)
      expect(s.loaded).toBe(false)
    })
  })

  describe('fetchUnread', () => {
    it('stores the unread map', async () => {
      get.mockResolvedValueOnce({ g1: 3 })
      const s = useGroupsStore()
      await s.fetchUnread()
      expect(get).toHaveBeenCalledWith('/groups/unread')
      expect(s.unread).toEqual({ g1: 3 })
    })

    it('swallows an error and keeps the previous map', async () => {
      get.mockRejectedValueOnce(new Error('down'))
      const s = useGroupsStore()
      s.unread = { g1: 1 }
      await s.fetchUnread()
      expect(s.unread).toEqual({ g1: 1 })
    })
  })

  describe('markRead', () => {
    it('posts the read receipt then refreshes the unread map', async () => {
      post.mockResolvedValueOnce(undefined)
      get.mockResolvedValueOnce({})
      const s = useGroupsStore()

      await s.markRead('g1')

      expect(post).toHaveBeenCalledWith('/groups/g1/read')
      expect(get).toHaveBeenCalledWith('/groups/unread')
      expect(s.unread).toEqual({})
    })

    it('ignores a failure without throwing', async () => {
      post.mockRejectedValueOnce(new Error('down'))
      const s = useGroupsStore()
      await expect(s.markRead('g1')).resolves.toBeUndefined()
    })
  })
})
