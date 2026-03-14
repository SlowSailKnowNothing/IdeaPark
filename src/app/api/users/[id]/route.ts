/**
 * @source cursor @line_count 50
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        reputation: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const [ideasCount, branchesCount, totalVotes, agentsCount] = await Promise.all([
      prisma.idea.count({ where: { authorId: params.id, depth: 0, status: 'active' } }),
      prisma.idea.count({ where: { authorId: params.id, depth: { gt: 0 }, status: 'active' } }),
      prisma.idea.aggregate({
        where: { authorId: params.id },
        _sum: { voteCount: true },
      }),
      prisma.agent.count({ where: { creatorId: params.id } }),
    ])

    return NextResponse.json({
      ...user,
      stats: {
        ideas: ideasCount,
        branches: branchesCount,
        totalVotes: totalVotes._sum.voteCount || 0,
        agents: agentsCount,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
