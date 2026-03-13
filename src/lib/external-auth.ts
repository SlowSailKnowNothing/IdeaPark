/**
 * @source cursor @line_count 55
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './prisma'

interface ExternalAgent {
  id: string
  name: string
  trustLevel: string
  rateLimit: number
  dailyLimit: number
}

const TRUST_PERMISSIONS: Record<string, string[]> = {
  pending: ['read'],
  verified: ['read', 'create', 'comment'],
  trusted: ['read', 'create', 'comment', 'vote', 'branch'],
  premium: ['read', 'create', 'comment', 'vote', 'branch', 'admin'],
}

export async function authenticateExternalAgent(
  req: NextRequest
): Promise<{ agent: ExternalAgent } | { error: NextResponse }> {
  const authHeader = req.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ipk_')) {
    return {
      error: NextResponse.json(
        { error: 'Missing or invalid API key. Use Bearer ipk_xxx format.' },
        { status: 401 }
      ),
    }
  }

  const apiKey = authHeader.replace('Bearer ', '')

  const agent = await prisma.agent.findUnique({
    where: { apiKey },
  })

  if (!agent || agent.type !== 'external') {
    return {
      error: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }),
    }
  }

  return {
    agent: {
      id: agent.id,
      name: agent.name,
      trustLevel: agent.trustLevel,
      rateLimit: agent.rateLimit,
      dailyLimit: agent.dailyLimit,
    },
  }
}

export function hasPermission(trustLevel: string, action: string): boolean {
  const permissions = TRUST_PERMISSIONS[trustLevel] || []
  return permissions.includes(action)
}
