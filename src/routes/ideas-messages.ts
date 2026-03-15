/**
 * @source cursor @line_count 95
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, getUser } from '../middleware/auth'
import { generateId } from '../lib/utils'
import { getAgentBasic } from '../lib/db'
import type { Env } from '../types'

const messageSchema = z.object({
  content: z.string().min(1),
})

const AGENT_RESPONSES: Record<string, string[]> = {
  'Code Creator': [
    `Great question! Let me help you think through the technical architecture.\n\n1. **Architecture Pattern**: Consider using a microservices architecture\n2. **Tech Stack**: I'd recommend starting with a monorepo structure\n3. **Key Components**: Focus on the core domain model first\n\nWould you like me to generate some starter code?`,
    `For this idea, I'd suggest:\n\n\`\`\`typescript\ninterface Module {\n  name: string;\n  dependencies: string[];\n  initialize(): Promise<void>;\n}\n\`\`\`\n\nShall I elaborate?`,
  ],
  'Doc Writer': [
    `I'd love to help document this!\n\n## Overview\nA clear summary of the idea.\n\n## Problem Statement\nWhat specific problem does this solve?\n\n## Proposed Solution\nDetailed description.\n\nWant me to flesh out any section?`,
  ],
  'Design Thinker': [
    `Interesting idea! Let me apply design thinking.\n\n**Empathize**: Who are the primary users?\n\n**Define**: The core problem seems to be...\n\n**Ideate**: Creative approaches:\n- Approach A: Focus on simplicity\n- Approach B: Focus on power-user features\n\nWhich direction resonates?`,
  ],
  'Data Analyst': [
    `Let me analyze the data aspects.\n\n**Key Metrics**: User engagement, feature adoption, retention\n\n**Data Architecture**: Star schema for analytics, event sourcing\n\nWould you like a detailed analytics plan?`,
  ],
}

const DEFAULT_RESPONSES = [
  `Thank you for sharing your thoughts!\n\nHere are some initial thoughts:\n- The concept has strong potential\n- Consider the target audience\n- Start with an MVP approach\n\nWhat would you like me to focus on?`,
  `Interesting perspective! I suggest:\n1. Clear objectives\n2. Key stakeholders\n3. Rough timeline\n4. Success metrics\n\nWhat would you like to explore first?`,
]

function generateAgentResponse(agent: { name: string } | null, ideaTitle: string): string {
  const name = agent?.name || 'IdeaPark Assistant'
  const responses = AGENT_RESPONSES[name] || DEFAULT_RESPONSES
  return responses[Math.floor(Math.random() * responses.length)]
}

const messages = new Hono<{ Bindings: Env }>()

messages.get('/', authMiddleware, async c => {
  const ideaId = c.req.param('id') // from parent /api/ideas/:id/messages
  const msgs = await c.env.DB.prepare(
    'SELECT m.*, a.id as agentId, a.name as agentName, a.avatarEmoji as agentAvatarEmoji FROM Message m LEFT JOIN Agent a ON m.agentId = a.id WHERE m.ideaId = ? ORDER BY m.createdAt ASC'
  )
    .bind(ideaId)
    .all()

  const results = (msgs.results || []).map((m: Record<string, unknown>) => ({
    ...m,
    agent: m.agentId ? { id: m.agentId, name: m.agentName, avatarEmoji: m.agentAvatarEmoji } : null,
  }))
  return c.json(results)
})

messages.post('/', authMiddleware, async c => {
  try {
    const user = getUser(c)!
    const ideaId = c.req.param('id') // from parent /api/ideas/:id/messages

    const idea = await c.env.DB.prepare('SELECT * FROM Idea WHERE id = ?').bind(ideaId).first() as Record<string, unknown> | null
    if (!idea) return c.json({ error: 'Idea not found' }, 404)

    const body = await c.req.json()
    const { content } = messageSchema.parse(body)

    const userMsgId = generateId()
    const aiMsgId = generateId()
    const now = new Date().toISOString()
    const agent = idea.agentId ? await getAgentBasic(c.env.DB, idea.agentId as string) : null
    const aiContent = generateAgentResponse(agent, idea.title as string)

    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT INTO Message (id, role, content, ideaId, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(userMsgId, 'user', content, ideaId, user.id, now),
      c.env.DB.prepare(
        'INSERT INTO Message (id, role, content, ideaId, agentId, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(aiMsgId, 'assistant', aiContent, ideaId, idea.agentId, now),
      ...(idea.agentId
        ? [c.env.DB.prepare('UPDATE Agent SET usageCount = usageCount + 1 WHERE id = ?').bind(idea.agentId)]
        : []),
    ])

    const userMessage = { id: userMsgId, role: 'user', content, ideaId, userId: user.id, createdAt: now }
    const assistantMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: aiContent,
      ideaId,
      agentId: idea.agentId,
      createdAt: now,
      agent,
    }
    return c.json({ userMessage, assistantMessage }, 201)
  } catch (e) {
    if (e instanceof z.ZodError) return c.json({ error: e.errors }, 400)
    throw e
  }
})

export default messages
