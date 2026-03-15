/**
 * @source cursor @line_count 55
 */
export interface Env {
  DB: D1Database
  JWT_SECRET?: string
}

export interface Variables {
  user?: {
    id: string
    email?: string
    name?: string
    role: string
    avatar?: string | null
  }
}

export interface User {
  id: string
  email: string
  name: string
  password: string
  avatar: string | null
  bio: string | null
  role: string
  reputation: number
  createdAt: string
  updatedAt: string
}

export interface Idea {
  id: string
  title: string
  description: string
  tags: string
  visibility: string
  status: string
  featured: number
  parentId: string | null
  rootId: string | null
  depth: number
  voteCount: number
  commentCount: number
  branchCount: number
  authorId: string
  agentId: string | null
  createdAt: string
  updatedAt: string
}

export interface JWTPayload {
  id: string
  email: string
  name: string
  role: string
  avatar?: string | null
  iat?: number
  exp?: number
}
