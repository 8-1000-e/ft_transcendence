// Compact relative time ("now", "5m", "3h", "2d") shared by every feed, thread,
// rail and notification list — they each had their own copy, and one of them had
// drifted to a hardcoded English "now". `t` is passed in because useI18n() can
// only be called from a component setup.
export function relativeTime(
  iso: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return t('forum.now')
  if (mins < 60) return `${mins}m`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}
