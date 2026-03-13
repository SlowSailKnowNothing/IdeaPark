/**
 * @source cursor @line_count 40
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [
    totalUsers,
    totalIdeas,
    totalVotes,
    totalAgents,
    totalComments,
    externalAgents,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.idea.count({ where: { status: 'active' } }),
    prisma.vote.count(),
    prisma.agent.count(),
    prisma.comment.count(),
    prisma.agent.count({ where: { type: 'external' } }),
  ])

  return NextResponse.json({
    totalUsers,
    totalIdeas,
    totalVotes,
    totalAgents,
    totalComments,
    externalAgents,
  })
}
