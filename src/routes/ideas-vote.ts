/**
 * @source cursor @line_count 95
 */
import { Hono } from 'hono'
import { authMiddleware, getUser } from '../middleware/auth'
import { generateId } from '../lib/utils'
import type { Env, Variables } from '../types'

const vote = new Hono<{ Bindings: Env; Variables: Variables }>()

vote.post('/', authMiddleware, async c => {
  const user = getUser(c)!
  const ideaId = c.req.param('id') // from parent route /api/ideas/:id/vote

  const idea = await c.env.DB.prepare('SELECT * FROM Idea WHERE id = ?').bind(ideaId).first() as Record<string, unknown> | null
  if (!idea) return c.json({ error: 'Idea not found' }, 404)

  const rootId = (idea.rootId || idea.id) as string

  const existingVote = await c.env.DB.prepare(
    'SELECT * FROM Vote WHERE userId = ? AND rootId = ?'
  )
    .bind(user.id, rootId)
    .first() as { id: string; ideaId: string } | null

  if (existingVote) {
    if (existingVote.ideaId === ideaId) {
      await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM Vote WHERE id = ?').bind(existingVote.id),
        c.env.DB.prepare('UPDATE Idea SET voteCount = voteCount - 1 WHERE id = ?').bind(ideaId),
      ])
      return c.json({ action: 'removed', ideaId })
    } else {
      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE Vote SET ideaId = ? WHERE id = ?').bind(ideaId, existingVote.id),
        c.env.DB.prepare('UPDATE Idea SET voteCount = voteCount - 1 WHERE id = ?').bind(existingVote.ideaId),
        c.env.DB.prepare('UPDATE Idea SET voteCount = voteCount + 1 WHERE id = ?').bind(ideaId),
      ])
      return c.json({ action: 'transferred', ideaId, fromIdeaId: existingVote.ideaId })
    }
  }
  const voteId = generateId()
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO Vote (id, userId, ideaId, rootId) VALUES (?, ?, ?, ?)')
      .bind(voteId, user.id, ideaId, rootId),
    c.env.DB.prepare('UPDATE Idea SET voteCount = voteCount + 1 WHERE id = ?').bind(ideaId),
  ])
  return c.json({ action: 'voted', ideaId })
})

vote.get('/status', async c => {
  const ideaId = c.req.param('id') // from parent route /api/ideas/:id/vote
  const idea = await c.env.DB.prepare('SELECT * FROM Idea WHERE id = ?').bind(ideaId).first() as Record<string, unknown> | null
  if (!idea) return c.json({ error: 'Idea not found' }, 404)

  const user = getUser(c)
  if (!user) return c.json({ voted: false, votedIdeaId: null, isCurrentIdea: false })

  const rootId = (idea.rootId || idea.id) as string
  const vote = await c.env.DB.prepare('SELECT ideaId FROM Vote WHERE userId = ? AND rootId = ?')
    .bind(user.id, rootId)
    .first() as { ideaId: string } | null

  return c.json({
    voted: !!vote,
    votedIdeaId: vote?.ideaId || null,
    isCurrentIdea: vote?.ideaId === ideaId,
  })
})

export default vote
