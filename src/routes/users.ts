/**
 * @source cursor @line_count 55
 */
import { Hono } from 'hono'
import type { Env } from '../types'

const users = new Hono<{ Bindings: Env }>()

users.get('/:id', async c => {
  const id = c.req.param('id')
  const user = await c.env.DB.prepare(
    'SELECT id, name, avatar, bio, reputation, createdAt FROM User WHERE id = ?'
  )
    .bind(id)
    .first() as Record<string, unknown> | null
  if (!user) return c.json({ error: 'User not found' }, 404)

  const [ideasCount, branchesCount, totalVotes, agentsCount] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM Idea WHERE authorId = ? AND depth = 0 AND status = ?').bind(id, 'active').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM Idea WHERE authorId = ? AND depth > 0 AND status = ?').bind(id, 'active').first(),
    c.env.DB.prepare('SELECT COALESCE(SUM(voteCount), 0) as s FROM Idea WHERE authorId = ?').bind(id).first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM Agent WHERE creatorId = ?').bind(id).first(),
  ])

  return c.json({
    ...user,
    stats: {
      ideas: (ideasCount as { c: number })?.c ?? 0,
      branches: (branchesCount as { c: number })?.c ?? 0,
      totalVotes: (totalVotes as { s: number })?.s ?? 0,
      agents: (agentsCount as { c: number })?.c ?? 0,
    },
  })
})

export default users
