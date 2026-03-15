/**
 * @source cursor @line_count 45
 */
import type { D1Database } from '@cloudflare/workers-types'

export function getAuthorSelect() {
  return { id: true, name: true, avatar: true }
}

export async function getAuthorFromUser(
  db: D1Database,
  userId: string
): Promise<{ id: string; name: string; avatar: string | null } | null> {
  const r = await db
    .prepare('SELECT id, name, avatar FROM User WHERE id = ?')
    .bind(userId)
    .first()
  return r as { id: string; name: string; avatar: string | null } | null
}

export async function getAgentBasic(
  db: D1Database,
  agentId: string
): Promise<{ id: string; name: string; avatarEmoji: string } | null> {
  const r = await db
    .prepare('SELECT id, name, avatarEmoji FROM Agent WHERE id = ?')
    .bind(agentId)
    .first()
  return r as { id: string; name: string; avatarEmoji: string } | null
}

export function ideaRowToJson(row: Record<string, unknown>): Record<string, unknown> {
  const r = { ...row }
  if (typeof r.featured === 'number') r.featured = r.featured === 1
  return r
}
