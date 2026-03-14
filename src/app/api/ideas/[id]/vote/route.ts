/**
 * @source cursor @line_count 75
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const idea = await prisma.idea.findUnique({ where: { id: params.id } })

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const rootId = idea.rootId || idea.id

    const existingVote = await prisma.vote.findUnique({
      where: { userId_rootId: { userId, rootId } },
    })

    if (existingVote) {
      if (existingVote.ideaId === idea.id) {
        // Toggle: remove vote
        await prisma.$transaction([
          prisma.vote.delete({ where: { id: existingVote.id } }),
          prisma.idea.update({
            where: { id: idea.id },
            data: { voteCount: { decrement: 1 } },
          }),
        ])
        return NextResponse.json({ action: 'removed', ideaId: idea.id })
      } else {
        // Transfer vote
        await prisma.$transaction([
          prisma.vote.update({
            where: { id: existingVote.id },
            data: { ideaId: idea.id },
          }),
          prisma.idea.update({
            where: { id: existingVote.ideaId },
            data: { voteCount: { decrement: 1 } },
          }),
          prisma.idea.update({
            where: { id: idea.id },
            data: { voteCount: { increment: 1 } },
          }),
        ])
        return NextResponse.json({ action: 'transferred', ideaId: idea.id, fromIdeaId: existingVote.ideaId })
      }
    } else {
      // New vote
      await prisma.$transaction([
        prisma.vote.create({
          data: { userId, ideaId: idea.id, rootId },
        }),
        prisma.idea.update({
          where: { id: idea.id },
          data: { voteCount: { increment: 1 } },
        }),
      ])
      return NextResponse.json({ action: 'voted', ideaId: idea.id })
    }
  } catch (error) {
    console.error('Error voting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
