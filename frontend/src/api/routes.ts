export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const ROUTES = {
  auth: {
    signup: '/signup',
    verify: '/verify',
    login: '/login',
    refresh: '/refresh',
    logout: '/logout',
    ft: '/auth/42',
    ftCallback: '/auth/42/callback',
  },

  users: {
    me: '/me',
    updateMe: '/me',
    deleteMe: '/me',
    cancelDelete: '/me/cancel',
    byId: (id: string) => `/users/${id}`,
  },

  posts: {
    feed: '/feed',
    listByProject: (projectId: string) => `/project/${projectId}/posts`,
    create: (projectId: string) => `/project/${projectId}/posts`,
    edit: (projectId: string, postId: string) =>
      `/project/${projectId}/${postId}`,
    vote: (postId: string) => `/posts/${postId}/vote`,
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
    unread: '/groups/unread',
    read: (groupId: string) => `/groups/${groupId}/read`,
    byId: (groupId: string) => `/groups/${groupId}`,
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
    byProject: (projectId: string, campusId: string) =>
      `/suggest/${projectId}/${campusId}`,
  },

  search: (q: string) => `/search?q=${encodeURIComponent(q)}`,
} as const;

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function fileUrl(filename: string): string {
  return `${API_BASE_URL}/files/${filename}`;
}
