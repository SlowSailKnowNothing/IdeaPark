/**
 * @source cursor @line_count 115
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { stringifyTags } from '@/lib/utils'

const createIdeaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(['public', 'private']).default('public'),
  agentId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sort = searchParams.get('sort') || 'hot'
    const tag = searchParams.get('tag')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 20)
    const skip = (page - 1) * limit

    const where: any = {
      visibility: 'public',
      status: 'active',
    }

    if (tag) {
      where.tags = { contains: tag }
    }

    let orderBy: any = {}
    if (sort === 'hot') {
      orderBy = { voteCount: 'desc' }
    } else if (sort === 'new') {
      orderBy = { createdAt: 'desc' }
    } else if (sort === 'featured') {
      where.featured = true
      orderBy = { voteCount: 'desc' }
    }

    const [ideas, total] = await Promise.all([
      prisma.idea.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: {
            select: { id: true, name: true, avatar: true },
          },
          agent: {
            select: { id: true, name: true, avatarEmoji: true },
          },
          _count: {
            select: { comments: true, children: true },
          },
        },
      }),
      prisma.idea.count({ where }),
    ])

    return NextResponse.json({ ideas, total, page, limit })
  } catch (error) {
    console.error('Error fetching ideas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, tags, visibility, agentId } = createIdeaSchema.parse(body)

    if (agentId) {
      const agent = await prisma.agent.findUnique({ where: { id: agentId } })
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }
    }

    const idea = await prisma.idea.create({
      data: {
        title,
        description,
        tags: stringifyTags(tags),
        visibility,
        authorId: (session.user as any).id,
        agentId: agentId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        agent: {
          select: { id: true, name: true, avatarEmoji: true },
        },
      },
    })

    // Set rootId to self for root ideas
    await prisma.idea.update({
      where: { id: idea.id },
      data: { rootId: idea.id },
    })

    return NextResponse.json({ ...idea, rootId: idea.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating idea:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
