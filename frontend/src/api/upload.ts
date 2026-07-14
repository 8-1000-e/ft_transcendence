import { API_BASE_URL } from './routes'
import { useAuthStore } from '@/stores/auth'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// Client-side gate mirroring the server's fileFilter, for instant feedback.
export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Only JPEG, PNG, GIF or WebP images'
  if (file.size > MAX_SIZE) return 'Image must be 5 MB or smaller'
  return null
}

// XHR (not fetch) so we can report upload progress via onProgress(0..100).
export function uploadImage(
  file: File,
  group = false,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const store = useAuthStore()
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}/upload${group ? '/group' : ''}`)
    if (store.accessToken) xhr.setRequestHeader('Authorization', `Bearer ${store.accessToken}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve((JSON.parse(xhr.responseText) as { url: string }).url)
        } catch {
          reject(new Error('Upload failed'))
        }
      } else {
        let msg = 'Upload failed'
        try {
          const p = JSON.parse(xhr.responseText) as { message?: string | string[] }
          msg = Array.isArray(p.message) ? p.message.join(', ') : (p.message ?? msg)
        } catch {
          /* keep default */
        }
        reject(new Error(msg))
      }
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    const form = new FormData()
    form.append('image', file)
    xhr.send(form)
  })
}

export async function deleteUpload(url: string): Promise<void> {
  const store = useAuthStore()
  const filename = url.split('/').pop()
  if (!filename) return
  await fetch(`${API_BASE_URL}/upload/${filename}`, {
    method: 'DELETE',
    headers: store.accessToken ? { Authorization: `Bearer ${store.accessToken}` } : {},
  }).catch(() => {})
}

export function publicUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}
