// Backend lives under /api; the localhost default keeps `npm run dev` working.
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const ROUTES = {
  projects: '/projects',
  feed: '/feed',
  search: (q: string) => `/search?q=${encodeURIComponent(q)}`,

  auth: {
    signup: '/signup',
    verify: '/verify',
    login: '/login',
    login2fa: '/login/2fa',
    refresh: '/refresh',
    logout: '/logout',
    ft: '/auth/42',
  },

  users: {
    me: '/me',
    activity: '/me/activity',
    export: '/me/export',
    ping: '/me/ping',
    updateMe: '/me',
    password: '/me/password',
    twofaSetup: '/me/2fa/setup',
    twofaEnable: '/me/2fa/enable',
    twofaDisable: '/me/2fa/disable',
    deleteMe: '/me',
    cancelDelete: '/me/cancel',
    byId: (id: string) => `/users/${id}`,
    activityById: (id: string) => `/users/${id}/activity`,
  },

  posts: {
    listByProject: (projectId: string) => `/project/${projectId}/posts`,
    single: (postId: string) => `/post/${postId}`,
    create: (projectId: string) => `/project/${projectId}/posts`,
    edit: (projectId: string, postId: string) =>
      `/project/${projectId}/${postId}`,
    vote: (postId: string) => `/posts/${postId}/vote`,
    posters: (projectId: string) => `/project/${projectId}/posters`,
    project: (projectId: string) => `/project/${projectId}`,
  },

  comments: {
    listByPost: (postId: string) => `/posts/${postId}/comments`,
    create: (postId: string) => `/posts/${postId}/comments`,
    edit: (commentId: string) => `/comments/${commentId}`,
    vote: (commentId: string) => `/comments/${commentId}/vote`,
  },

  replies: {
    listByComment: (commentId: string) => `/comments/${commentId}/replies`,
    create: (commentId: string) => `/comments/${commentId}/replies`,
    edit: (replyId: string) => `/replies/${replyId}`,
  },

  groups: {
    list: '/groups',
    byId: (groupId: string) => `/groups/${groupId}`,
    members: (groupId: string) => `/groups/${groupId}/members`,
    edit: (groupId: string) => `/groups/${groupId}`,
    messages: (groupId: string) => `/groups/${groupId}/messages`,
    sendMessage: (groupId: string) => `/groups/${groupId}/message`,
    replyMessage: (groupId: string, replyMessageId: string) =>
      `/groups/${groupId}/message/${replyMessageId}`,
    editMessage: (groupId: string, messageId: string) =>
      `/groups/${groupId}/messages/${messageId}`,
    deleteMessage: (groupId: string, messageId: string) =>
      `/groups/${groupId}/messages/${messageId}`,
  },

  suggest: {
    forProject: (projectId: string) => `/suggest/${projectId}`,
  },

  notifications: {
    list: '/notifications',
    read: '/notifications/read',
  },

  friends: {
    list: '/friends',
    requests: '/friends/requests',
    status: (id: string) => `/friends/status/${id}`,
    request: (id: string) => `/friends/${id}`,
    accept: (id: string) => `/friends/${id}/accept`,
    remove: (id: string) => `/friends/${id}`,
  },
} as const;
