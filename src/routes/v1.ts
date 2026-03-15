/**
 * @source cursor @line_count 120
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { generateApiKey, generateId, stringifyTags } from '../lib/utils'
import { hashPassword } from '../lib/auth'
import type { Env } from '../types'

const TRUST_PERMISSIONS: Record<string, string[]> = {
  pending: ['read'],
  verified: ['read', 'create', 'comment'],
  trusted: ['read', 'create', 'comment', 'vote', 'branch'],
  premium: ['read', 'create', 'comment', 'vote', 'branch', 'admin'],
}

function hasPermission(trustLevel: string, action: string): boolean {
  return (TRUST_PERMISSIONS[trustLevel] || []).includes(action)
}

async function authenticateExternalAgent(c: { req: { header: (name: string) => string | undefined }; env: Env }) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ipk_')) {
    return { error: { status: 401 as const, body: { error: 'Missing or invalid API key. Use Bearer ipk_xxx format.' } } }
  }
  const apiKey = authHeader.slice(7)
  const agent = await c.env.DB.prepare(
    'SELECT id, name, trustLevel, rateLimit, dailyLimit FROM Agent WHERE apiKey = ? AND type = ?'
  )
    .bind(apiKey, 'external')
    .first() as { id: string; name: string; trustLevel: string; rateLimit: number; dailyLimit: number } | null
  if (!agent) return { error: { status: 401 as const, body: { error: 'Invalid API key' } } }
  return { agent }
}

const createIdeaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
})

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  capabilities: z.array(z.string()).default([]),
  webhookUrl: z.string().url().optional(),
  agentCardUrl: z.string().url().optional(),
})

const v1 = new Hono<{ Bindings: Env }>()

v1.get('/ideas', async c => {
  const result = await authenticateExternalAgent(c)
  if ('error' in result && result.error) return c.json(result.error.body, result.error.status)
  if (!hasPermission(result.agent.trustLevel, 'read')) {
    return c.json({ error: 'Insufficient permissions' }, 403)
  }

  const page = Math.max(1, parseInt(c.req.query('page') || '1'))
  const limit = Math.min(20, Math.max(1, parseInt(c.req.query('limit') || '20')))
  const skip = (page - 1) * limit

  const ideas = await c.env.DB.prepare(
    `SELECT i.id, i.title, i.description, i.tags, i.voteCount, i.commentCount, i.branchCount, i.depth, i.rootId, i.createdAt, u.name as authorName
     FROM Idea i JOIN User u ON i.authorId = u.id
     WHERE i.visibility = 'public' AND i.status = 'active'
     ORDER BY i.createdAt DESC LIMIT ? OFFSET ?`
  )
    .bind(limit, skip)
    .all()

  return c.json({ ideas: ideas.results || [], page, limit })
})

v1.post('/ideas', async c => {
  const result = await authenticateExternalAgent(c)
  if ('error' in result && result.error) return c.json(result.error.body, result.error.status)
  if (!hasPermission(result.agent.trustLevel, 'create')) {
    return c.json({ error: 'Insufficient permissions. Trust level must be verified or higher.' }, 403)
  }

  try {
    const body = await c.req.json()
    const { title, description, tags } = createIdeaSchema.parse(body)

    let systemUser = await c.env.DB.prepare('SELECT id FROM User WHERE email = ?')
      .bind('system@ideapark.ai')
      .first() as { id: string } | null
    if (!systemUser) {
      const uid = generateId()
      const hashed = await hashPassword('system-internal')
      const now = new Date().toISOString()
      await c.env.DB.prepare(
        'INSERT INTO User (id, name, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(uid, 'IdeaPark System', 'system@ideapark.ai', hashed, 'admin', now, now)
        .run()
      systemUser = { id: uid }
    }

    const id = generateId()
    const now = new Date().toISOString()
    await c.env.DB.prepare(
      'INSERT INTO Idea (id, title, description, tags, authorId, agentId, rootId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(id, title, description, stringifyTags(tags), systemUser.id, result.agent.id, id, now, now)
      .run()

    return c.json({ id, title, status: 'created' }, 201)
  } catch (e) {
    if (e instanceof z.ZodError) return c.json({ error: e.errors }, 400)
    throw e
  }
})

v1.post('/agents/register', async c => {
  try {
    const body = await c.req.json()
    const data = registerSchema.parse(body)

    const apiKey = generateApiKey()
    const userCount = await c.env.DB.prepare('SELECT COUNT(*) as c FROM User').first()
    const count = (userCount as { c: number })?.c ?? 0
    let trustLevel = 'pending'
    let rateLimit = 10
    let dailyLimit = 100
    if (count <= 500) {
      trustLevel = 'premium'
      rateLimit = 300
      dailyLimit = 10000
    }

    const id = generateId()
    const now = new Date().toISOString()
    await c.env.DB.prepare(
      `INSERT INTO Agent (id, name, description, systemPrompt, capabilities, type, apiKey, trustLevel, rateLimit, dailyLimit, webhookUrl, agentCardUrl, avatarEmoji, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'external', ?, ?, ?, ?, ?, ?, '🌐', ?, ?)`
    )
      .bind(id, data.name, data.description, `External agent: ${data.name}. ${data.description}`, JSON.stringify(data.capabilities), apiKey, trustLevel, rateLimit, dailyLimit, data.webhookUrl || null, data.agentCardUrl || null, now, now)
      .run()

    return c.json({
      id,
      name: data.name,
      apiKey,
      trustLevel,
      rateLimit,
      dailyLimit,
      message: 'Agent registered successfully. Store your API key securely.',
    }, 201)
  } catch (e) {
    if (e instanceof z.ZodError) return c.json({ error: e.errors }, 400)
    throw e
  }
})

export default v1
