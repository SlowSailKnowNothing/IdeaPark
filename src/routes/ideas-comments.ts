/**
 * @source cursor @line_count 95
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, getUser } from '../middleware/auth'
import { generateId } from '../lib/utils'
import { getAuthorFromUser } from '../lib/db'
import type { D1Database } from '@cloudflare/workers-types'
import type { Env } from '../types'

const commentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().optional(),
})

const comments = new Hono<{ Bindings: Env }>()

async function getCommentWithReplies(db: D1Database, id: string): Promise<Record<string, unknown> | null> {
  const comment = await db.prepare('SELECT * FROM Comment WHERE id = ?').bind(id).first() as Record<string, unknown> | null
  if (!comment) return null
  const author = await getAuthorFromUser(db, comment.authorId as string)
  const replies = await db.prepare('SELECT * FROM Comment WHERE parentId = ? ORDER BY createdAt ASC').bind(id).all()
  const replyList = await Promise.all(
    (replies.results || []).map(async (r: Record<string, unknown>) => {
      const reply = await getCommentWithReplies(db, r.id as string)
      return reply || { ...r, author: null, replies: [] }
    })
  )
  return { ...comment, author: author || { id: '', name: 'Unknown', avatar: null }, replies: replyList }
}

comments.get('/', async c => {
  const ideaId = c.req.param('id') // from parent /api/ideas/:id/comments
  const topComments = await c.env.DB.prepare(
    'SELECT * FROM Comment WHERE ideaId = ? AND parentId IS NULL ORDER BY createdAt DESC'
  )
    .bind(ideaId)
    .all()

  const result = await Promise.all(
    (topComments.results || []).map(async (r: Record<string, unknown>) => getCommentWithReplies(c.env.DB, r.id as string))
  )

  return c.json(result.filter(Boolean))
})

comments.post('/', authMiddleware, async c => {
  try {
    const user = getUser(c)!
    const ideaId = c.req.param('id') // from parent /api/ideas/:id/comments

    const idea = await c.env.DB.prepare('SELECT id FROM Idea WHERE id = ?').bind(ideaId).first()
    if (!idea) return c.json({ error: 'Idea not found' }, 404)

    const body = await c.req.json()
    const { content, parentId } = commentSchema.parse(body)

    const id = generateId()
    const now = new Date().toISOString()
    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT INTO Comment (id, content, ideaId, authorId, parentId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, content, ideaId, user.id, parentId || null, now, now),
      c.env.DB.prepare('UPDATE Idea SET commentCount = commentCount + 1 WHERE id = ?').bind(ideaId),
    ])

    const comment = await c.env.DB.prepare('SELECT * FROM Comment WHERE id = ?').bind(id).first() as Record<string, unknown>
    const author = await getAuthorFromUser(c.env.DB, user.id)
    return c.json({ ...comment, author: author || { id: user.id, name: '', avatar: null } }, 201)
  } catch (e) {
    if (e instanceof z.ZodError) return c.json({ error: e.errors }, 400)
    throw e
  }
})

export default comments
