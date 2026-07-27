import { ref, type Ref } from 'vue'
import type { Page } from '@/types/api'

// Cursor pagination; guards concurrent calls and drops a stale response for a list reset mid-flight (epoch).
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
