export type VoteValue = 'UP' | 'DOWN'

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

export interface ProjectRef {
  projectId: string
  projectName: string
}

export interface Post {
  id: string
  projectId: string
  projectName?: string
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

export interface PublicUser {
  id: string
  name: string
  ftPfpUrl?: string | null
  campus?: string | null
  createdAt?: string
}
