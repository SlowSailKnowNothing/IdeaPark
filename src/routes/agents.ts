/**
 * @source cursor @line_count 130
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, getUser } from '../middleware/auth'
import { generateId } from '../lib/utils'
import { getAuthorFromUser } from '../lib/db'
import type { Env } from '../types'

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  systemPrompt: z.string().min(1),
  capabilities: z.array(z.string()).default([]),
  modelName: z.string().default('gpt-4'),
  visibility: z.enum(['public', 'private']).default('public'),
  avatarEmoji: z.string().default('🤖'),
})

const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().max(500).optional(),
})

const agents = new Hono<{ Bindings: Env }>()

agents.get('/', async c => {
  const type = c.req.query('type')
  const sort = c.req.query('sort') || 'popular'
  const page = Math.max(1, parseInt(c.req.query('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20')))
  const skip = (page - 1) * limit

  const sortWhitelist: Record<string, string> = {
    popular: 'usageCount DESC',
    rating: 'avgRating DESC',
    new: 'createdAt DESC',
  }
  const orderBy = sortWhitelist[sort] || 'usageCount DESC'

  let where = "visibility = 'public'"
  const typeWhitelist = ['community', 'external', 'builtin']
  if (type && typeWhitelist.includes(type)) {
    where += ` AND type = '${type}'`
  }

  const list = await c.env.DB.prepare(
    `SELECT a.*, u.id as creatorId, u.name as creatorName, u.avatar as creatorAvatar FROM Agent a LEFT JOIN User u ON a.creatorId = u.id WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  )
    .bind(limit, skip)
    .all()

  const countRes = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM Agent WHERE ${where}`).first()
  const total = (countRes as { total: number })?.total ?? 0

  const results = (list.results || []).map((a: Record<string, unknown>) => ({
    ...a,
    creator: a.creatorId ? { id: a.creatorId, name: a.creatorName, avatar: a.creatorAvatar } : null,
  }))

  return c.json({ agents: results, total, page, limit })
})

agents.post('/', authMiddleware, async c => {
  try {
    const user = getUser(c)!
    const body = await c.req.json()
    const data = createAgentSchema.parse(body)

    const id = generateId()
    const now = new Date().toISOString()
    await c.env.DB.prepare(
      `INSERT INTO Agent (id, name, description, systemPrompt, capabilities, modelName, visibility, avatarEmoji, type, creatorId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'community', ?, ?, ?)`
    )
      .bind(id, data.name, data.description, data.systemPrompt, JSON.stringify(data.capabilities), data.modelName, data.visibility, data.avatarEmoji, user.id, now, now)
      .run()

    const agent = await c.env.DB.prepare('SELECT * FROM Agent WHERE id = ?').bind(id).first() as Record<string, unknown>
    const creator = await getAuthorFromUser(c.env.DB, user.id)
    return c.json({ ...agent, creator: creator || { id: user.id, name: '', avatar: null } }, 201)
  } catch (e) {
    if (e instanceof z.ZodError) return c.json({ error: e.errors }, 400)
    throw e
  }
})

agents.get('/:id', async c => {
  const id = c.req.param('id')
  const agent = await c.env.DB.prepare(
    'SELECT a.*, u.id as creatorId, u.name as creatorName, u.avatar as creatorAvatar FROM Agent a LEFT JOIN User u ON a.creatorId = u.id WHERE a.id = ?'
  )
    .bind(id)
    .first() as Record<string, unknown> | null
  if (!agent) return c.json({ error: 'Agent not found' }, 404)

  const ratings = await c.env.DB.prepare(
    `SELECT r.*, u.id as userId, u.name as userName, u.avatar as userAvatar FROM AgentRating r JOIN User u ON r.userId = u.id WHERE r.agentId = ? ORDER BY r.createdAt DESC LIMIT 10`
  )
    .bind(id)
    .all()

  return c.json({
    ...agent,
    creator: agent.creatorId ? { id: agent.creatorId, name: agent.creatorName, avatar: agent.creatorAvatar } : null,
    ratings: (ratings.results || []).map((r: Record<string, unknown>) => ({
      ...r,
      user: { id: r.userId, name: r.userName, avatar: r.userAvatar },
    })),
  })
})

agents.post('/:id/rate', authMiddleware, async c => {
  try {
    const user = getUser(c)!
    const agentId = c.req.param('id')
    const agent = await c.env.DB.prepare('SELECT id FROM Agent WHERE id = ?').bind(agentId).first()
    if (!agent) return c.json({ error: 'Agent not found' }, 404)

    const body = await c.req.json()
    const { rating, review } = ratingSchema.parse(body)

    const existing = await c.env.DB.prepare(
      'SELECT id FROM AgentRating WHERE agentId = ? AND userId = ?'
    )
      .bind(agentId, user.id)
      .first() as { id: string } | null

    if (existing) {
      await c.env.DB.prepare('UPDATE AgentRating SET rating = ?, review = ? WHERE id = ?')
        .bind(rating, review || null, existing.id)
        .run()
    } else {
      const rid = generateId()
      const now = new Date().toISOString()
      await c.env.DB.prepare(
        'INSERT INTO AgentRating (id, rating, review, agentId, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(rid, rating, review || null, agentId, user.id, now)
        .run()
    }

    const allRatings = await c.env.DB.prepare('SELECT rating FROM AgentRating WHERE agentId = ?')
      .bind(agentId)
      .all()
    const ratings = (allRatings.results || []) as { rating: number }[]
    const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0

    await c.env.DB.prepare('UPDATE Agent SET avgRating = ?, ratingCount = ? WHERE id = ?')
      .bind(avg, ratings.length, agentId)
      .run()

    return c.json({ success: true, avgRating: avg })
  } catch (e) {
    if (e instanceof z.ZodError) return c.json({ error: e.errors }, 400)
    throw e
  }
})

export default agents
