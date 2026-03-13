/**
 * @source cursor @line_count 60
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().max(500).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agent = await prisma.agent.findUnique({ where: { id: params.id } })
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const body = await req.json()
    const { rating, review } = ratingSchema.parse(body)
    const userId = (session.user as any).id

    const existingRating = await prisma.agentRating.findUnique({
      where: { agentId_userId: { agentId: params.id, userId } },
    })

    if (existingRating) {
      await prisma.agentRating.update({
        where: { id: existingRating.id },
        data: { rating, review },
      })
    } else {
      await prisma.agentRating.create({
        data: { rating, review, agentId: params.id, userId },
      })
    }

    // Recalculate average rating
    const allRatings = await prisma.agentRating.findMany({
      where: { agentId: params.id },
    })
    const avg = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length

    await prisma.agent.update({
      where: { id: params.id },
      data: { avgRating: avg, ratingCount: allRatings.length },
    })

    return NextResponse.json({ success: true, avgRating: avg })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
