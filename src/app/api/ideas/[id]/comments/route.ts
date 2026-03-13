/**
 * @source cursor @line_count 80
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const commentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.comment.findMany({
      where: { ideaId: params.id, parentId: null },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, avatar: true } },
            replies: {
              include: {
                author: { select: { id: true, name: true, avatar: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(comments)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idea = await prisma.idea.findUnique({ where: { id: params.id } })
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const body = await req.json()
    const { content, parentId } = commentSchema.parse(body)

    const comment = await prisma.comment.create({
      data: {
        content,
        ideaId: params.id,
        authorId: (session.user as any).id,
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    })

    await prisma.idea.update({
      where: { id: params.id },
      data: { commentCount: { increment: 1 } },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
