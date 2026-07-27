export type VoteValue = 'UP' | 'DOWN'

/** A cursor-paginated page. `nextCursor` is null when there is no more. */
export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

export interface Author {
  name: string | null
  ftPfpUrl: string | null
  campus: string | null
}

export interface Group {
  id: string
  groupName: string
  githubLink: string | null
  projectId: string
  projectName: string | null
  groupCampus: string | null
  usersId: string[]
}

// Live 42 profile of a group member (never persisted server-side).
export interface GroupMember {
  ftId: string
  login: string
  name: string
  ppUrl: string | null
}

export interface ProjectRef {
  projectId: string
  projectName: string
}

/** A top poster in a project — from GET /project/:id/posters. */
export interface Poster {
  writer: string
  user: Author
  count: number
}

export interface Post {
  id: string
  projectId: string
  title: string | null
  content: string
  filesUrl: string[]
  postedAt: string
  editedAt: string | null
  writer: string
  user: Author
  upvotes: number
  downvotes: number
  myVote: VoteValue | null
  _count?: { chats: number }
}

export interface Comment {
  id: string
  content: string
  filesUrl: string[]
  postedAt: string
  editedAt: string | null
  writer: string
  user: Author
  upvotes: number
  downvotes: number
  myVote: VoteValue | null
  _count?: { replies: number }
}

export interface Reply {
  id: string
  content: string
  filesUrl: string[]
  postedAt: string
  editedAt: string | null
  writer: string
  user: Author
  upvotes: number
  downvotes: number
  myVote: VoteValue | null
  _count?: { replies: number }
}

export interface Message {
  id: string
  content: string
  filesUrl: string[]
  sendTime: string
  updatedAt: string
  sender: string
  messageReply: string | null
  user?: Author
}

export type NotifType =
  | 'COMMENT'
  | 'REPLY'
  | 'MESSAGE'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPT'

export interface NotificationItem {
  id: string
  type: NotifType
  actorName: string | null
  entityLabel: string | null
  link: string | null
  read: boolean
  createdAt: string
}

export interface NotificationsPage {
  items: NotificationItem[]
  unread: number
}

/** A friend or incoming request — from GET /friends and /friends/requests. */
export interface FriendView {
  id: string
  name: string
  login: string | null
  ftPfpUrl: string | null
  campus: string | null
  online: boolean
  // Seat they're currently sitting at (live 42 read), null when not on campus.
  location: string | null
}

export type FriendStatus =
  | 'self'
  | 'friends'
  | 'pending_out'
  | 'pending_in'
  | 'none'

export interface PublicUser {
  id: string
  name: string
  login?: string | null
  karma?: number
  ftPfpUrl?: string | null
  campus?: string | null
  createdAt?: string
  online?: boolean
}

/** A project hit from GET /search. */
export interface SearchProject {
  id: string
  name: string
  category: string | null
  postCount: number
}

/** A comment/reply hit from GET /search, carrying its host post for linking. */
export interface SearchComment extends Comment {
  postId: string
  projectId: string
  postTitle: string | null
}

export interface SearchResults {
  projects: SearchProject[]
  posts: Post[]
  comments: SearchComment[]
}

/** A post the user authored — from GET /me/activity or /users/:id/activity. */
export interface ActivityPost {
  id: string
  projectId: string
  projectName: string | null
  title: string | null
  content: string
  postedAt: string
  upvotes: number
  downvotes: number
}

/** A comment the user authored — from GET /me/activity or /users/:id/activity. */
export interface ActivityComment {
  id: string
  postId: string | null
  postTitle: string | null
  projectId: string | null
  projectName: string | null
  content: string
  postedAt: string
  upvotes: number
  downvotes: number
}

export interface Activity {
  posts: ActivityPost[]
  comments: ActivityComment[]
}
