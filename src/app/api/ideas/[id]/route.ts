/**
 * @source cursor @line_count 100
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { stringifyTags } from '@/lib/utils'

const updateIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['public', 'private']).optional(),
  status: z.enum(['active', 'archived']).optional(),
  featured: z.boolean().optional(),
  agentId: z.string().nullable().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idea = await prisma.idea.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, reputation: true },
        },
        agent: {
          select: { id: true, name: true, avatarEmoji: true, description: true },
        },
        parent: {
          select: { id: true, title: true },
        },
        _count: {
          select: { comments: true, children: true, votes: true },
        },
      },
    })

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const session = await getServerSession(authOptions)
    if (idea.visibility === 'private' && idea.authorId !== (session?.user as any)?.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(idea)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
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

    const userId = (session.user as any).id
    const isAdmin = (session.user as any).role === 'admin'
    if (idea.authorId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const updates = updateIdeaSchema.parse(body)

    const data: any = { ...updates }
    if (updates.tags) {
      data.tags = stringifyTags(updates.tags)
    }
    if (!isAdmin) {
      delete data.featured
    }

    const updated = await prisma.idea.update({
      where: { id: params.id },
      data,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        agent: { select: { id: true, name: true, avatarEmoji: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const userId = (session.user as any).id
    const isAdmin = (session.user as any).role === 'admin'
    if (idea.authorId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.idea.update({
      where: { id: params.id },
      data: { status: 'archived' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
