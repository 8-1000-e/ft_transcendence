import { createRouter, createWebHistory } from 'vue-router'
import { navigationGuard } from './guard'

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
          path: 'p/:projectId',
          name: 'project',
          component: () => import('@/views/app/ProjectFeedView.vue'),
        },
        {
          path: 'post/:postId',
          name: 'post',
          component: () => import('@/views/app/PostDetailView.vue'),
        },
        {
          path: 'g/:groupId',
          name: 'group',
          component: () => import('@/views/app/GroupChatView.vue'),
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
          path: 'me',
          name: 'me',
          component: () => import('@/views/app/ProfileView.vue'),
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(navigationGuard)

export default router
