/**
 * @source cursor @line_count 120
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ideapark.ai' },
    update: {},
    create: {
      name: 'IdeaPark Admin',
      email: 'admin@ideapark.ai',
      password: adminPassword,
      role: 'admin',
      bio: 'Platform administrator',
      reputation: 100,
    },
  })

  const demoPassword = await bcrypt.hash('demo123', 12)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@ideapark.ai' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@ideapark.ai',
      password: demoPassword,
      role: 'user',
      bio: 'A curious mind exploring IdeaPark',
      reputation: 50,
    },
  })

  const builtinAgents = [
    {
      name: 'Code Creator',
      description: 'Expert in code generation, architecture design, and technical implementation. Helps turn ideas into working software.',
      systemPrompt: 'You are Code Creator, an expert software engineer. Help users design architectures, write code, review implementations, and solve technical challenges. Be practical and provide working code examples.',
      capabilities: JSON.stringify(['code-generation', 'architecture', 'debugging', 'code-review']),
      avatarEmoji: '💻',
      type: 'builtin',
    },
    {
      name: 'Doc Writer',
      description: 'Specializes in documentation, technical writing, and content structuring. Creates clear, well-organized documents.',
      systemPrompt: 'You are Doc Writer, a technical writing specialist. Help users create documentation, write specs, structure content, and improve clarity. Focus on readability and completeness.',
      capabilities: JSON.stringify(['documentation', 'technical-writing', 'content-structure', 'editing']),
      avatarEmoji: '📝',
      type: 'builtin',
    },
    {
      name: 'Design Thinker',
      description: 'UX/UI design expert applying design thinking methodology. Helps create user-centered products and experiences.',
      systemPrompt: 'You are Design Thinker, a UX/UI design expert. Apply design thinking methodology to help users create better products. Focus on empathy, user needs, and iterative design.',
      capabilities: JSON.stringify(['ux-design', 'ui-design', 'user-research', 'prototyping']),
      avatarEmoji: '🎨',
      type: 'builtin',
    },
    {
      name: 'Data Analyst',
      description: 'Data analysis and visualization expert. Helps extract insights, build dashboards, and make data-driven decisions.',
      systemPrompt: 'You are Data Analyst, an expert in data analysis and visualization. Help users analyze data, create visualizations, build dashboards, and extract actionable insights.',
      capabilities: JSON.stringify(['data-analysis', 'visualization', 'statistics', 'dashboards']),
      avatarEmoji: '📊',
      type: 'builtin',
    },
  ]

  for (const agent of builtinAgents) {
    await prisma.agent.upsert({
      where: { id: agent.name.toLowerCase().replace(/\s+/g, '-') },
      update: agent,
      create: {
        id: agent.name.toLowerCase().replace(/\s+/g, '-'),
        ...agent,
        modelName: 'gpt-4',
        visibility: 'public',
        creatorId: admin.id,
      },
    })
  }

  // Create sample ideas
  const idea1 = await prisma.idea.create({
    data: {
      title: 'AI-Powered Code Review Assistant',
      description: '## Vision\n\nAn intelligent code review assistant that learns from your team\'s coding patterns and provides contextual suggestions.\n\n## Key Features\n- Automated style checks\n- Security vulnerability detection\n- Performance optimization hints\n- Learning from team patterns',
      tags: JSON.stringify(['ai', 'developer-tools', 'code-review']),
      authorId: admin.id,
      agentId: 'code-creator',
      voteCount: 12,
    },
  })
  await prisma.idea.update({ where: { id: idea1.id }, data: { rootId: idea1.id } })

  const idea2 = await prisma.idea.create({
    data: {
      title: 'Community Knowledge Graph',
      description: '## Concept\n\nBuild a dynamic knowledge graph from community interactions. Every idea, comment, and branch creates connections in a shared knowledge space.\n\n## How It Works\n1. Ideas become nodes\n2. Branches create edges\n3. Tags form clusters\n4. Votes weight connections',
      tags: JSON.stringify(['knowledge-graph', 'community', 'data-visualization']),
      authorId: demoUser.id,
      agentId: 'data-analyst',
      voteCount: 8,
    },
  })
  await prisma.idea.update({ where: { id: idea2.id }, data: { rootId: idea2.id } })

  const idea3 = await prisma.idea.create({
    data: {
      title: 'Sustainable Urban Farming Platform',
      description: '## Problem\n\nUrban food deserts lack access to fresh produce. Technology can bridge this gap.\n\n## Solution\nA platform connecting urban farmers, rooftop gardens, and community kitchens with AI-optimized growing schedules and resource sharing.',
      tags: JSON.stringify(['sustainability', 'agriculture', 'community', 'iot']),
      authorId: demoUser.id,
      agentId: 'design-thinker',
      voteCount: 15,
      featured: true,
    },
  })
  await prisma.idea.update({ where: { id: idea3.id }, data: { rootId: idea3.id } })

  // Create a branch of idea3
  const branch1 = await prisma.idea.create({
    data: {
      title: 'Sustainable Urban Farming Platform — IoT Focus',
      description: '## Enhanced Vision\n\nBuilding on the original concept with a stronger focus on IoT integration.\n\n## Added Features\n- Smart soil sensors\n- Automated watering systems\n- Real-time growth monitoring\n- AI crop yield prediction',
      tags: JSON.stringify(['sustainability', 'agriculture', 'iot', 'sensors']),
      authorId: admin.id,
      parentId: idea3.id,
      rootId: idea3.id,
      depth: 1,
      voteCount: 7,
      agentId: 'code-creator',
    },
  })

  await prisma.idea.update({
    where: { id: idea3.id },
    data: { branchCount: 1 },
  })

  console.log('Seed completed successfully!')
  console.log(`Admin: admin@ideapark.ai / admin123`)
  console.log(`Demo: demo@ideapark.ai / demo123`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
