/**
 * @source cursor @line_count 60
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface EvolutionNode {
  id: string
  title: string
  depth: number
  voteCount: number
  authorName: string
  authorAvatar: string | null
  branchCount: number
  createdAt: Date
  children: EvolutionNode[]
}

async function buildTree(rootId: string): Promise<EvolutionNode | null> {
  const allIdeas = await prisma.idea.findMany({
    where: { rootId, status: 'active' },
    include: {
      author: { select: { name: true, avatar: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (allIdeas.length === 0) return null

  const nodeMap = new Map<string, EvolutionNode>()

  for (const idea of allIdeas) {
    nodeMap.set(idea.id, {
      id: idea.id,
      title: idea.title,
      depth: idea.depth,
      voteCount: idea.voteCount,
      authorName: idea.author.name,
      authorAvatar: idea.author.avatar,
      branchCount: idea.branchCount,
      createdAt: idea.createdAt,
      children: [],
    })
  }

  let root: EvolutionNode | null = null
  for (const idea of allIdeas) {
    const node = nodeMap.get(idea.id)!
    if (idea.parentId && nodeMap.has(idea.parentId)) {
      nodeMap.get(idea.parentId)!.children.push(node)
    } else if (idea.id === rootId) {
      root = node
    }
  }

  const totalVotes = allIdeas.reduce((sum, i) => sum + i.voteCount, 0)
  const contributors = new Set(allIdeas.map(i => i.authorId)).size

  return root ? { ...root, _meta: { totalVersions: allIdeas.length, totalVotes, contributors } } as any : null
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idea = await prisma.idea.findUnique({ where: { id: params.id } })
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const rootId = idea.rootId || idea.id
    const tree = await buildTree(rootId)

    return NextResponse.json({ tree, rootId })
  } catch (error) {
    console.error('Error building evolution tree:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
