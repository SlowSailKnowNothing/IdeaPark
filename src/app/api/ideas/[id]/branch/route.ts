/**
 * @source cursor @line_count 82
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

    const parentIdea = await prisma.idea.findUnique({
      where: { id: params.id },
      include: {
        artifacts: true,
        agent: { select: { id: true } },
      },
    })

    if (!parentIdea) {
      return NextResponse.json({ error: 'Parent idea not found' }, { status: 404 })
    }

    if (parentIdea.visibility === 'private' && parentIdea.authorId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Cannot branch a private idea' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const title = body.title || parentIdea.title
    const description = body.description || parentIdea.description

    const rootId = parentIdea.rootId || parentIdea.id

    const branch = await prisma.idea.create({
      data: {
        title,
        description,
        tags: parentIdea.tags,
        visibility: 'public',
        parentId: parentIdea.id,
        rootId,
        depth: parentIdea.depth + 1,
        authorId: (session.user as any).id,
        agentId: parentIdea.agentId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        agent: { select: { id: true, name: true, avatarEmoji: true } },
      },
    })

    // Inherit artifacts
    if (parentIdea.artifacts.length > 0) {
      await prisma.artifact.createMany({
        data: parentIdea.artifacts.map(a => ({
          title: a.title,
          type: a.type,
          content: a.content,
          language: a.language,
          version: a.version,
          ideaId: branch.id,
        })),
      })
    }

    // Update parent's branch count
    await prisma.idea.update({
      where: { id: parentIdea.id },
      data: { branchCount: { increment: 1 } },
    })

    return NextResponse.json(branch, { status: 201 })
  } catch (error) {
    console.error('Error creating branch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
