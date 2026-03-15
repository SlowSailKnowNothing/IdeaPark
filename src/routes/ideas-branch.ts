/**
 * @source cursor @line_count 75
 */
import { Hono } from 'hono'
import { authMiddleware, getUser } from '../middleware/auth'
import { generateId } from '../lib/utils'
import { getAuthorFromUser, getAgentBasic, ideaRowToJson } from '../lib/db'
import type { Env } from '../types'

const branch = new Hono<{ Bindings: Env }>()

branch.post('/', authMiddleware, async c => {
  const user = getUser(c)!
  const parentId = c.req.param('id') // from parent /api/ideas/:id/branch

  const parentIdea = await c.env.DB.prepare(
    'SELECT * FROM Idea WHERE id = ?'
  ).bind(parentId).first() as Record<string, unknown> | null
  if (!parentIdea) return c.json({ error: 'Parent idea not found' }, 404)
  if (parentIdea.visibility === 'private' && parentIdea.authorId !== user.id) {
    return c.json({ error: 'Cannot branch a private idea' }, 403)
  }

  const body = await c.req.json().catch(() => ({})) as { title?: string; description?: string }
  const title = body.title || (parentIdea.title as string)
  const description = body.description || (parentIdea.description as string)
  const rootId = (parentIdea.rootId || parentIdea.id) as string
  const depth = ((parentIdea.depth as number) || 0) + 1

  const id = generateId()
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    `INSERT INTO Idea (id, title, description, tags, visibility, parentId, rootId, depth, authorId, agentId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'public', ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, title, description, parentIdea.tags, parentId, rootId, depth, user.id, parentIdea.agentId, now, now)
    .run()

  const artifacts = await c.env.DB.prepare('SELECT * FROM Artifact WHERE ideaId = ?').bind(parentId).all()
  if (artifacts.results && artifacts.results.length > 0) {
    const inserts = (artifacts.results as Record<string, unknown>[]).map(a => {
      const aid = generateId()
      return c.env.DB.prepare(
        'INSERT INTO Artifact (id, title, type, content, language, version, ideaId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(aid, a.title, a.type, a.content, a.language || null, a.version || 1, id, now, now)
    })
    await c.env.DB.batch(inserts)
  }

  await c.env.DB.prepare('UPDATE Idea SET branchCount = branchCount + 1 WHERE id = ?').bind(parentId).run()

  const branchIdea = await c.env.DB.prepare('SELECT * FROM Idea WHERE id = ?').bind(id).first() as Record<string, unknown>
  const author = await getAuthorFromUser(c.env.DB, user.id)
  const agent = parentIdea.agentId ? await getAgentBasic(c.env.DB, parentIdea.agentId as string) : null

  return c.json({
    ...ideaRowToJson(branchIdea),
    author: author || { id: user.id, name: '', avatar: null },
    agent,
  }, 201)
})

export default branch
