import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }))

import { useGroupsStore } from './groups'
import type { Group } from '@/types/api'

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
  beforeEach(() => setActivePinia(createPinia()))

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
