/**
 * @source cursor @line_count 90
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const messageSchema = z.object({
  content: z.string().min(1),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const messages = await prisma.message.findMany({
      where: { ideaId: params.id },
      include: {
        agent: { select: { id: true, name: true, avatarEmoji: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(messages)
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

    const idea = await prisma.idea.findUnique({
      where: { id: params.id },
      include: { agent: true },
    })

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const body = await req.json()
    const { content } = messageSchema.parse(body)

    const userMessage = await prisma.message.create({
      data: {
        role: 'user',
        content,
        ideaId: params.id,
        userId: (session.user as any).id,
      },
    })

    // Simulate AI response based on the bound agent
    const agent = idea.agent
    const aiResponseContent = generateAgentResponse(agent, content, idea.title)

    const assistantMessage = await prisma.message.create({
      data: {
        role: 'assistant',
        content: aiResponseContent,
        ideaId: params.id,
        agentId: agent?.id,
      },
      include: {
        agent: { select: { id: true, name: true, avatarEmoji: true } },
      },
    })

    if (agent) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { usageCount: { increment: 1 } },
      })
    }

    return NextResponse.json({
      userMessage,
      assistantMessage,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error in workspace chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateAgentResponse(agent: any, userMessage: string, ideaTitle: string): string {
  const agentName = agent?.name || 'IdeaPark Assistant'
  const agentType = agent?.type || 'general'

  const responses: Record<string, string[]> = {
    'Code Creator': [
      `Great question about "${ideaTitle}"! Let me help you think through the technical architecture.\n\nBased on your message, here are my suggestions:\n\n1. **Architecture Pattern**: Consider using a microservices architecture for scalability\n2. **Tech Stack**: I'd recommend starting with a monorepo structure\n3. **Key Components**: Focus on the core domain model first\n\nWould you like me to generate some starter code or dive deeper into any of these areas?`,
      `For this idea, I'd suggest the following implementation approach:\n\n\`\`\`typescript\n// Core module structure\ninterface Module {\n  name: string;\n  dependencies: string[];\n  initialize(): Promise<void>;\n}\n\n// You can extend this pattern for your specific needs\n\`\`\`\n\nShall I elaborate on the implementation details?`,
    ],
    'Doc Writer': [
      `I'd love to help document "${ideaTitle}"!\n\nHere's a suggested documentation structure:\n\n## Overview\nA clear, one-paragraph summary of the idea.\n\n## Problem Statement\nWhat specific problem does this solve?\n\n## Proposed Solution\nDetailed description of the approach.\n\n## User Stories\n- As a user, I want to...\n- As an admin, I want to...\n\nWant me to flesh out any of these sections?`,
    ],
    'Design Thinker': [
      `Interesting idea! Let me apply some design thinking to "${ideaTitle}".\n\n**Empathize**: Who are the primary users? What are their pain points?\n\n**Define**: The core problem seems to be...\n\n**Ideate**: Here are some creative approaches:\n- Approach A: Focus on simplicity\n- Approach B: Focus on power-user features\n- Approach C: Hybrid approach with progressive disclosure\n\nWhich direction resonates with you?`,
    ],
    'Data Analyst': [
      `Let me analyze the data aspects of "${ideaTitle}".\n\n**Key Metrics to Track**:\n1. User engagement rate\n2. Feature adoption rate\n3. Retention metrics\n\n**Data Architecture**:\n- Consider a star schema for analytics\n- Use event sourcing for audit trails\n- Implement real-time dashboards\n\nWould you like me to create a detailed analytics plan?`,
    ],
  }

  const agentResponses = responses[agentName] || [
    `Thank you for sharing your thoughts on "${ideaTitle}"!\n\nAs ${agentName}, I can help you explore this further. Here are some initial thoughts:\n\n- The concept has strong potential\n- Consider the target audience carefully\n- Start with an MVP approach\n\nWhat specific aspect would you like me to focus on?`,
    `Interesting perspective! Let me build on that idea.\n\nFor "${ideaTitle}", I suggest:\n1. Start with clear objectives\n2. Identify key stakeholders\n3. Create a rough timeline\n4. Define success metrics\n\nWhat would you like to explore first?`,
  ]

  return agentResponses[Math.floor(Math.random() * agentResponses.length)]
}
