import { API_BASE_URL } from './routes'
import { useAuthStore } from '@/stores/auth'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const DOC_TYPES = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv']
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// `accept` attribute for file inputs — mirrors the server's allow-list.
export const ACCEPT_UPLOAD = 'image/*,.pdf,.txt,.md,.csv'

// Client-side gate mirroring the server's fileFilter, for instant feedback.
export function validateUpload(file: File): string | null {
  // Some browsers send an empty type for .md/.csv — fall back to the extension.
  const byType = [...IMAGE_TYPES, ...DOC_TYPES].includes(file.type)
  const byExt = /\.(jpe?g|png|gif|webp|pdf|txt|md|csv)$/i.test(file.name)
  if (!byType && !byExt) return 'Allowed: images, PDF, TXT, MD or CSV'
  if (file.size > MAX_SIZE) return 'File must be 5 MB or smaller'
  return null
}

// Images render inline; anything else is shown as a downloadable attachment.
export function isImageUrl(url: string): boolean {
  return IMAGE_EXT.test(url)
}

// The stored name is a uuid; show the extension so the file type is obvious.
export function fileLabel(url: string): string {
  return url.split('/').pop() ?? 'file'
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
