/**
 * @source cursor @line_count 35
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ voted: false, votedIdeaId: null })
    }

    const idea = await prisma.idea.findUnique({ where: { id: params.id } })
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const rootId = idea.rootId || idea.id
    const userId = (session.user as any).id

    const vote = await prisma.vote.findUnique({
      where: { userId_rootId: { userId, rootId } },
    })

    return NextResponse.json({
      voted: !!vote,
      votedIdeaId: vote?.ideaId || null,
      isCurrentIdea: vote?.ideaId === params.id,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
