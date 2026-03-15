/**
 * @source cursor @line_count 220
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, getUser } from '../middleware/auth'
import { stringifyTags, generateId } from '../lib/utils'
import { getAuthorFromUser, getAgentBasic, ideaRowToJson } from '../lib/db'
import type { Env, Variables } from '../types'

const createIdeaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(['public', 'private']).default('public'),
  agentId: z.string().optional(),
})

const updateIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['public', 'private']).optional(),
  status: z.enum(['active', 'archived']).optional(),
  featured: z.boolean().optional(),
  agentId: z.string().nullable().optional(),
})

const ideas = new Hono<{ Bindings: Env; Variables: Variables }>()

ideas.get('/', async c => {
  const sort = c.req.query('sort') || 'hot'
  const tag = c.req.query('tag')
  const page = Math.max(1, parseInt(c.req.query('page') || '1'))
  const limit = Math.min(20, Math.max(1, parseInt(c.req.query('limit') || '20')))
  const skip = (page - 1) * limit

  let orderBy = 'voteCount DESC'
  let where = "visibility = 'public' AND status = 'active'"
  if (sort === 'new') orderBy = 'createdAt DESC'
  else if (sort === 'featured') {
    where += " AND featured = 1"
    orderBy = 'voteCount DESC'
  }
  const tagParam = tag ? `%"${String(tag).replace(/"/g, '')}"%` : null
  if (tagParam) {
    where += ' AND tags LIKE ?'
  }

  const ideasRes = await c.env.DB.prepare(
    `SELECT * FROM Idea WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  )
    .bind(...(tagParam ? [tagParam, limit, skip] : [limit, skip]))
    .all()

  const countRes = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM Idea WHERE ${where}`
  )
    .bind(...(tagParam ? [tagParam] : []))
    .first()

  const total = (countRes as { total: number })?.total ?? 0
  const rows = (ideasRes.results || []) as Record<string, unknown>[]

  const result = await Promise.all(
    rows.map(async row => {
      const idea = ideaRowToJson(row)
      const author = await getAuthorFromUser(c.env.DB, row.authorId as string)
      const agent = row.agentId
        ? await getAgentBasic(c.env.DB, row.agentId as string)
        : null
      const commentCount = row.commentCount
      const branchCount = row.branchCount
      return {
        ...idea,
        author: author || { id: '', name: 'Unknown', avatar: null },
        agent,
        _count: { comments: commentCount, children: branchCount },
      }
    })
  )

  return c.json({ ideas: result, total, page, limit })
})

ideas.post('/', authMiddleware, async c => {
  try {
    const user = getUser(c)!
    const body = await c.req.json()
    const { title, description, tags, visibility, agentId } = createIdeaSchema.parse(body)

    if (agentId) {
      const agent = await c.env.DB.prepare('SELECT id FROM Agent WHERE id = ?')
        .bind(agentId)
        .first()
      if (!agent) return c.json({ error: 'Agent not found' }, 404)
    }

    const id = generateId()
    const now = new Date().toISOString()
    await c.env.DB.prepare(
      `INSERT INTO Idea (id, title, description, tags, visibility, authorId, agentId, rootId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, title, description, stringifyTags(tags), visibility, user.id, agentId || null, id, now, now)
      .run()

    const idea = await c.env.DB.prepare('SELECT * FROM Idea WHERE id = ?').bind(id).first() as Record<string, unknown>
    const author = await getAuthorFromUser(c.env.DB, user.id)
    const agent = agentId ? await getAgentBasic(c.env.DB, agentId) : null

    return c.json(
      { ...ideaRowToJson(idea), rootId: id, author: author || { id: user.id, name: '', avatar: null }, agent },
      201
    )
  } catch (e) {
    if (e instanceof z.ZodError) return c.json({ error: e.errors }, 400)
    throw e
  }
})

ideas.get('/:id', async c => {
  const id = c.req.param('id')
  const idea = await c.env.DB.prepare('SELECT * FROM Idea WHERE id = ?').bind(id).first() as Record<string, unknown> | null
  if (!idea) return c.json({ error: 'Idea not found' }, 404)

  const user = getUser(c)
  if (idea.visibility === 'private' && idea.authorId !== user?.id) {
    return c.json({ error: 'Not found' }, 404)
  }

  const [author, agent, parent, commentCount, childrenCount, votesCount] = await Promise.all([
    getAuthorFromUser(c.env.DB, idea.authorId as string),
    idea.agentId ? c.env.DB.prepare('SELECT id, name, avatarEmoji, description FROM Agent WHERE id = ?').bind(idea.agentId).first() : null,
    idea.parentId ? c.env.DB.prepare('SELECT id, title FROM Idea WHERE id = ?').bind(idea.parentId).first() : null,
    c.env.DB.prepare('SELECT COUNT(*) as c FROM Comment WHERE ideaId = ?').bind(id).first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM Idea WHERE parentId = ?').bind(id).first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM Vote WHERE ideaId = ?').bind(id).first(),
  ])

  return c.json({
    ...ideaRowToJson(idea),
    author: author || { id: '', name: 'Unknown', avatar: null, reputation: 0 },
    agent: agent || null,
    parent: parent || null,
    _count: {
      comments: (commentCount as { c: number })?.c ?? 0,
      children: (childrenCount as { c: number })?.c ?? 0,
      votes: (votesCount as { c: number })?.c ?? 0,
    },
  })
})

ideas.patch('/:id', authMiddleware, async c => {
  try {
    const user = getUser(c)!
    const id = c.req.param('id')
    const idea = await c.env.DB.prepare('SELECT * FROM Idea WHERE id = ?').bind(id).first() as Record<string, unknown> | null
    if (!idea) return c.json({ error: 'Idea not found' }, 404)
    if (idea.authorId !== user.id && user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const body = await c.req.json()
    const updates = updateIdeaSchema.parse(body)
    if (user.role !== 'admin') delete (updates as Record<string, unknown>).featured

    const setClauses: string[] = []
    const values: unknown[] = []
    if (updates.title !== undefined) { setClauses.push('title = ?'); values.push(updates.title) }
    if (updates.description !== undefined) { setClauses.push('description = ?'); values.push(updates.description) }
    if (updates.tags !== undefined) { setClauses.push('tags = ?'); values.push(stringifyTags(updates.tags)) }
    if (updates.visibility !== undefined) { setClauses.push('visibility = ?'); values.push(updates.visibility) }
    if (updates.status !== undefined) { setClauses.push('status = ?'); values.push(updates.status) }
    if (updates.featured !== undefined) { setClauses.push('featured = ?'); values.push(updates.featured ? 1 : 0) }
    if (updates.agentId !== undefined) { setClauses.push('agentId = ?'); values.push(updates.agentId) }
    setClauses.push('updatedAt = ?')
    values.push(new Date().toISOString())
    values.push(id)

    await c.env.DB.prepare(`UPDATE Idea SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values).run()

    const updated = await c.env.DB.prepare('SELECT * FROM Idea WHERE id = ?').bind(id).first() as Record<string, unknown>
    const author = await getAuthorFromUser(c.env.DB, idea.authorId as string)
    const agent = idea.agentId ? await getAgentBasic(c.env.DB, idea.agentId as string) : null

    return c.json({
      ...ideaRowToJson(updated),
      author: author || { id: '', name: '', avatar: null },
      agent,
    })
  } catch (e) {
    if (e instanceof z.ZodError) return c.json({ error: e.errors }, 400)
    throw e
  }
})

ideas.delete('/:id', authMiddleware, async c => {
  const user = getUser(c)!
  const id = c.req.param('id')
  const idea = await c.env.DB.prepare('SELECT * FROM Idea WHERE id = ?').bind(id).first() as Record<string, unknown> | null
  if (!idea) return c.json({ error: 'Idea not found' }, 404)
  if (idea.authorId !== user.id && user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await c.env.DB.prepare('UPDATE Idea SET status = ?, updatedAt = ? WHERE id = ?')
    .bind('archived', new Date().toISOString(), id)
    .run()

  return c.json({ success: true })
})

export default ideas
