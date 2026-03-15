/**
 * @source cursor @line_count 70
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, getUser } from '../middleware/auth'
import { generateId } from '../lib/utils'
import type { Env } from '../types'

const artifactSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['code', 'document', 'design', 'data']),
  content: z.string().min(1),
  language: z.string().optional(),
})

const artifacts = new Hono<{ Bindings: Env }>()

artifacts.get('/', async c => {
  const ideaId = c.req.param('id') // from parent /api/ideas/:id/artifacts
  const list = await c.env.DB.prepare(
    'SELECT * FROM Artifact WHERE ideaId = ? ORDER BY createdAt DESC'
  )
    .bind(ideaId)
    .all()
  return c.json(list.results || [])
})

artifacts.post('/', authMiddleware, async c => {
  try {
    const ideaId = c.req.param('id') // from parent /api/ideas/:id/artifacts
    const idea = await c.env.DB.prepare('SELECT id FROM Idea WHERE id = ?').bind(ideaId).first()
    if (!idea) return c.json({ error: 'Idea not found' }, 404)

    const body = await c.req.json()
    const { title, type, content, language } = artifactSchema.parse(body)

    const existing = await c.env.DB.prepare(
      'SELECT version FROM Artifact WHERE ideaId = ? AND title = ? ORDER BY version DESC LIMIT 1'
    )
      .bind(ideaId, title)
      .first() as { version: number } | null
    const version = existing ? existing.version + 1 : 1

    const id = generateId()
    const now = new Date().toISOString()
    await c.env.DB.prepare(
      'INSERT INTO Artifact (id, title, type, content, language, version, ideaId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(id, title, type, content, language || null, version, ideaId, now, now)
      .run()

    const artifact = await c.env.DB.prepare('SELECT * FROM Artifact WHERE id = ?').bind(id).first()
    return c.json(artifact, 201)
  } catch (e) {
    if (e instanceof z.ZodError) return c.json({ error: e.errors }, 400)
    throw e
  }
})

export default artifacts
