import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('@/views/Signup.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/verify',
      name: 'verify',
      component: () => import('@/views/Verify.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/views/AuthCallback.vue'),
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/views/legal/PrivacyView.vue'),
    },
    {
      path: '/terms',
      name: 'terms',
      component: () => import('@/views/legal/TermsView.vue'),
    },
    {
      path: '/',
      component: () => import('@/layouts/AppShell.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'feed',
          component: () => import('@/views/app/FeedView.vue'),
        },
        {
          path: 'browse',
          name: 'browse',
          component: () => import('@/views/app/BrowseView.vue'),
        },
        {
          path: 'search',
          name: 'search',
          component: () => import('@/views/app/SearchView.vue'),
        },
        {
          path: 'p/:projectId',
          name: 'project',
          components: {
            default: () => import('@/views/app/ProjectFeedView.vue'),
            rail: () => import('@/components/ProjectContextRail.vue'),
          },
        },
        {
          path: 'post/:postId',
          name: 'post',
          component: () => import('@/views/app/PostDetailView.vue'),
        },
        {
          path: 'g/:groupId',
          name: 'group',
          components: {
            default: () => import('@/views/app/GroupChatView.vue'),
            rail: () => import('@/components/ProjectContextRail.vue'),
          },
        },
        {
          path: 'suggest/:projectId',
          name: 'suggest',
          component: () => import('@/views/app/SuggestView.vue'),
        },
        {
          path: 'u/:id',
          name: 'user',
          component: () => import('@/views/app/PublicProfileView.vue'),
        },
        {
          path: 'friends',
          name: 'friends',
          component: () => import('@/views/app/FriendsView.vue'),
        },
        {
          path: 'me',
          name: 'me',
          component: () => import('@/views/app/ProfileView.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/app/SettingsView.vue'),
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'feed' }
  }
  return true
})

export default router
