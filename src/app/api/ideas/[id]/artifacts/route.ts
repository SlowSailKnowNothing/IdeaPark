/**
 * @source cursor @line_count 70
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const artifactSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['code', 'document', 'design', 'data']),
  content: z.string().min(1),
  language: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const artifacts = await prisma.artifact.findMany({
      where: { ideaId: params.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(artifacts)
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
    const { title, type, content, language } = artifactSchema.parse(body)

    const existingArtifact = await prisma.artifact.findFirst({
      where: { ideaId: params.id, title },
      orderBy: { version: 'desc' },
    })

    const artifact = await prisma.artifact.create({
      data: {
        title,
        type,
        content,
        language: language || null,
        version: existingArtifact ? existingArtifact.version + 1 : 1,
        ideaId: params.id,
      },
    })

    return NextResponse.json(artifact, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
