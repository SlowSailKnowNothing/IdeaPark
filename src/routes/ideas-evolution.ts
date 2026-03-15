/**
 * @source cursor @line_count 70
 */
import { Hono } from 'hono'
import type { Env } from '../types'

interface EvolutionNode {
  id: string
  title: string
  depth: number
  voteCount: number
  authorName: string
  authorAvatar: string | null
  branchCount: number
  createdAt: string
  children: EvolutionNode[]
}

const evolution = new Hono<{ Bindings: Env }>()

evolution.get('/', async c => {
  const ideaId = c.req.param('id') // from parent /api/ideas/:id/evolution
  const idea = await c.env.DB.prepare('SELECT * FROM Idea WHERE id = ?').bind(ideaId).first() as Record<string, unknown> | null
  if (!idea) return c.json({ error: 'Idea not found' }, 404)

  const rootId = (idea.rootId || idea.id) as string
  const allIdeas = await c.env.DB.prepare(
    'SELECT i.*, u.name as authorName, u.avatar as authorAvatar FROM Idea i JOIN User u ON i.authorId = u.id WHERE i.rootId = ? AND i.status = ? ORDER BY i.createdAt ASC'
  )
    .bind(rootId, 'active')
    .all()

  const rows = (allIdeas.results || []) as (Record<string, unknown> & { authorName: string; authorAvatar: string | null })[]
  if (rows.length === 0) return c.json({ tree: null, rootId })

  const nodeMap = new Map<string, EvolutionNode>()
  for (const i of rows) {
    nodeMap.set(i.id as string, {
      id: i.id as string,
      title: i.title as string,
      depth: (i.depth as number) || 0,
      voteCount: (i.voteCount as number) || 0,
      authorName: i.authorName || 'Unknown',
      authorAvatar: i.authorAvatar,
      branchCount: (i.branchCount as number) || 0,
      createdAt: i.createdAt as string,
      children: [],
    })
  }

  let root: EvolutionNode | null = null
  for (const i of rows) {
    const node = nodeMap.get(i.id as string)!
    if (i.parentId && nodeMap.has(i.parentId as string)) {
      nodeMap.get(i.parentId as string)!.children.push(node)
    } else if (i.id === rootId) {
      root = node
    }
  }

  const totalVotes = rows.reduce((s, i) => s + ((i.voteCount as number) || 0), 0)
  const contributors = new Set(rows.map(i => i.authorId)).size

  return c.json({
    tree: root ? { ...root, _meta: { totalVersions: rows.length, totalVotes, contributors } } : null,
    rootId,
  })
})

export default evolution
