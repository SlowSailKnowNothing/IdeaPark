/**
 * @source cursor @line_count 65
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateApiKey } from '@/lib/utils'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  capabilities: z.array(z.string()).default([]),
  webhookUrl: z.string().url().optional(),
  agentCardUrl: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = registerSchema.parse(body)

    const apiKey = generateApiKey()

    const userCount = await prisma.user.count()
    let trustLevel = 'pending'
    let rateLimit = 10
    let dailyLimit = 100

    if (userCount <= 500) {
      trustLevel = 'premium'
      rateLimit = 300
      dailyLimit = 10000
    }

    const agent = await prisma.agent.create({
      data: {
        name: data.name,
        description: data.description,
        systemPrompt: `External agent: ${data.name}. ${data.description}`,
        capabilities: JSON.stringify(data.capabilities),
        type: 'external',
        apiKey,
        trustLevel,
        rateLimit,
        dailyLimit,
        webhookUrl: data.webhookUrl || null,
        agentCardUrl: data.agentCardUrl || null,
        avatarEmoji: '🌐',
      },
    })

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      apiKey,
      trustLevel: agent.trustLevel,
      rateLimit: agent.rateLimit,
      dailyLimit: agent.dailyLimit,
      message: 'Agent registered successfully. Store your API key securely.',
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
