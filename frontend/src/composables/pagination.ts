import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { Page } from '@/types/api'

/**
 * Cursor pagination state for a list. `fetchPage(cursor)` returns one page;
 * `loadMore()` appends the next and tracks when the list is exhausted.
 * Concurrent/duplicate calls are guarded, and a stale response for a list that
 * was reset (e.g. route change) is dropped.
 */
export function usePaginated<T>(fetchPage: (cursor: string | null) => Promise<Page<T>>) {
  const items = ref<T[]>([]) as Ref<T[]>
  const cursor = ref<string | null>(null)
  const loading = ref(false)
  const done = ref(false)
  const error = ref('')
  let epoch = 0

  async function loadMore(): Promise<void> {
    if (loading.value || done.value) return
    loading.value = true
    error.value = ''
    const mine = epoch
    try {
      const page = await fetchPage(cursor.value)
      if (mine !== epoch) return // reset happened mid-flight
      items.value.push(...page.items)
      cursor.value = page.nextCursor
      if (!page.nextCursor) done.value = true
    } catch (e) {
      if (mine === epoch) error.value = (e as { message?: string }).message ?? 'Failed to load'
    } finally {
      if (mine === epoch) loading.value = false
    }
  }

  function reset(): void {
    epoch += 1
    items.value = []
    cursor.value = null
    done.value = false
    error.value = ''
    loading.value = false
  }

  async function reload(): Promise<void> {
    reset()
    await loadMore()
  }

  return { items, cursor, loading, done, error, loadMore, reset, reload }
}

/**
 * Fire `onReach` when the sentinel element scrolls into view — infinite scroll.
 * Pass the same element ref you place at the bottom of the list.
 */
export function useInfiniteScroll(
  sentinel: Ref<HTMLElement | null>,
  onReach: () => void,
) {
  let observer: IntersectionObserver | null = null

  watch(
    sentinel,
    (el) => {
      observer?.disconnect()
      if (!el) return
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) onReach()
        },
        { rootMargin: '400px' },
      )
      observer.observe(el)
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(() => observer?.disconnect())
}
