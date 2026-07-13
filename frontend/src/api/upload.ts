import { API_BASE_URL } from './routes'
import { useAuthStore } from '@/stores/auth'

export async function uploadImage(file: File, group = false): Promise<string> {
  const store = useAuthStore()
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${API_BASE_URL}/upload${group ? '/group' : ''}`, {
    method: 'POST',
    headers: store.accessToken
      ? { Authorization: `Bearer ${store.accessToken}` }
      : {},
    body: form,
  })
  if (!res.ok) throw new Error("Échec de l'upload")
  const data = (await res.json()) as { url: string }
  return data.url
}

export function publicUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}
