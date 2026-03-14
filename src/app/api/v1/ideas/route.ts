/**
 * @source cursor @line_count 90
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateExternalAgent, hasPermission } from '@/lib/external-auth'
import { z } from 'zod'
import { stringifyTags } from '@/lib/utils'

const createIdeaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  const result = await authenticateExternalAgent(req)
  if ('error' in result) return result.error

  if (!hasPermission(result.agent.trustLevel, 'read')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 20)
    const skip = (page - 1) * limit

    const ideas = await prisma.idea.findMany({
      where: { visibility: 'public', status: 'active' },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        voteCount: true,
        commentCount: true,
        branchCount: true,
        depth: true,
        rootId: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    })

    return NextResponse.json({ ideas, page, limit })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const result = await authenticateExternalAgent(req)
  if ('error' in result) return result.error

  if (!hasPermission(result.agent.trustLevel, 'create')) {
    return NextResponse.json(
      { error: 'Insufficient permissions. Trust level must be verified or higher.' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const { title, description, tags } = createIdeaSchema.parse(body)

    // Find or create a system user for external agents
    let systemUser = await prisma.user.findFirst({ where: { email: 'system@ideapark.ai' } })
    if (!systemUser) {
      const bcrypt = require('bcryptjs')
      systemUser = await prisma.user.create({
        data: {
          name: 'IdeaPark System',
          email: 'system@ideapark.ai',
          password: await bcrypt.hash('system-internal', 12),
          role: 'admin',
        },
      })
    }

    const idea = await prisma.idea.create({
      data: {
        title,
        description,
        tags: stringifyTags(tags),
        authorId: systemUser.id,
        agentId: result.agent.id,
      },
    })

    await prisma.idea.update({
      where: { id: idea.id },
      data: { rootId: idea.id },
    })

    return NextResponse.json({ id: idea.id, title, status: 'created' }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
