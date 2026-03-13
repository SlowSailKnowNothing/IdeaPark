/**
 * @source cursor @line_count 95
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  systemPrompt: z.string().min(1),
  capabilities: z.array(z.string()).default([]),
  modelName: z.string().default('gpt-4'),
  visibility: z.enum(['public', 'private']).default('public'),
  avatarEmoji: z.string().default('🤖'),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const sort = searchParams.get('sort') || 'popular'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const skip = (page - 1) * limit

    const where: any = { visibility: 'public' }
    if (type) where.type = type

    let orderBy: any = {}
    if (sort === 'popular') {
      orderBy = { usageCount: 'desc' }
    } else if (sort === 'rating') {
      orderBy = { avgRating: 'desc' }
    } else {
      orderBy = { createdAt: 'desc' }
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          creator: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.agent.count({ where }),
    ])

    return NextResponse.json({ agents, total, page, limit })
  } catch (error) {
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
    const data = createAgentSchema.parse(body)

    const agent = await prisma.agent.create({
      data: {
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt,
        capabilities: JSON.stringify(data.capabilities),
        modelName: data.modelName,
        visibility: data.visibility,
        avatarEmoji: data.avatarEmoji,
        type: 'community',
        creatorId: (session.user as any).id,
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
      },
    })

    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
