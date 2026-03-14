/**
 * @source cursor @line_count 60
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateTrustSchema = z.object({
  agentId: z.string(),
  trustLevel: z.enum(['pending', 'verified', 'trusted', 'premium']),
})

const TRUST_LIMITS: Record<string, { rateLimit: number; dailyLimit: number }> = {
  pending: { rateLimit: 10, dailyLimit: 100 },
  verified: { rateLimit: 30, dailyLimit: 500 },
  trusted: { rateLimit: 60, dailyLimit: 2000 },
  premium: { rateLimit: 300, dailyLimit: 10000 },
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const agents = await prisma.agent.findMany({
    where: { type: 'external' },
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(agents)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { agentId, trustLevel } = updateTrustSchema.parse(body)

    const limits = TRUST_LIMITS[trustLevel]

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        trustLevel,
        rateLimit: limits.rateLimit,
        dailyLimit: limits.dailyLimit,
      },
    })

    return NextResponse.json(agent)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
