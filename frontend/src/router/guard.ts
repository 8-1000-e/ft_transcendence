import type { RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function navigationGuard(to: RouteLocationNormalized) {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'feed' }
  }
  return true
}
