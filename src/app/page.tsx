/**
 * @source cursor @line_count 200
 */
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { parseTags, formatDate } from '@/lib/utils'
import {
  Sparkles,
  GitBranch,
  Vote,
  Bot,
  ArrowRight,
  TrendingUp,
  MessageCircle,
  Lightbulb,
  Zap,
  Globe,
} from 'lucide-react'

async function getFeaturedIdeas() {
  return prisma.idea.findMany({
    where: { visibility: 'public', status: 'active' },
    orderBy: { voteCount: 'desc' },
    take: 6,
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      agent: { select: { id: true, name: true, avatarEmoji: true } },
    },
  })
}

async function getStats() {
  const [ideas, users, agents, votes] = await Promise.all([
    prisma.idea.count({ where: { status: 'active' } }),
    prisma.user.count(),
    prisma.agent.count(),
    prisma.vote.count(),
  ])
  return { ideas, users, agents, votes }
}

export default async function HomePage() {
  const [ideas, stats] = await Promise.all([getFeaturedIdeas(), getStats()])

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm backdrop-blur-sm mb-6">
              <Sparkles className="h-4 w-4" />
              Where Ideas Come to Life with AI
            </div>
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Idea<span className="text-brand-200">Park</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-100 leading-relaxed">
              Create ideas, evolve them through community branches, and collaborate with AI Agents.
              The best ideas naturally emerge through collective intelligence.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/ideas"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg transition-all hover:shadow-xl hover:scale-105"
              >
                Explore Ideas
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Ideas', value: stats.ideas, icon: Lightbulb },
              { label: 'Users', value: stats.users, icon: Globe },
              { label: 'Agents', value: stats.agents, icon: Bot },
              { label: 'Votes', value: stats.votes, icon: TrendingUp },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <stat.icon className="h-5 w-5 text-brand-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-3 text-gray-600">Three mechanisms that make the best ideas emerge</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: GitBranch,
                title: 'Evolution Tree',
                desc: 'Ideas branch and evolve like species. Anyone can fork an idea, creating variations that compete for community attention.',
                color: 'bg-emerald-100 text-emerald-700',
              },
              {
                icon: Vote,
                title: 'One Vote Per Tree',
                desc: 'Each user gets one vote per evolution tree. Voting for a better branch automatically transfers your vote — natural selection at work.',
                color: 'bg-blue-100 text-blue-700',
              },
              {
                icon: Zap,
                title: 'AI Workspace',
                desc: 'Every idea has an AI workspace. Agents generate code, docs, and designs. When you branch, all artifacts are inherited.',
                color: 'bg-purple-100 text-purple-700',
              },
            ].map((item) => (
              <div key={item.title} className="card p-6 text-center">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Ideas */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Trending Ideas</h2>
              <p className="mt-1 text-gray-600">The most voted ideas in the community</p>
            </div>
            <Link href="/ideas" className="btn-secondary gap-1.5">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea) => (
              <Link key={idea.id} href={`/ideas/${idea.id}`} className="card p-6 group">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                    {idea.title}
                  </h3>
                  {idea.agent && (
                    <span className="ml-2 text-lg flex-shrink-0" title={idea.agent.name}>
                      {idea.agent.avatarEmoji}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {idea.description.replace(/[#*`\[\]]/g, '').substring(0, 120)}...
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {parseTags(idea.tags).slice(0, 3).map((tag) => (
                    <span key={tag} className="badge-green">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {idea.voteCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {idea.commentCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3.5 w-3.5" />
                      {idea.branchCount}
                    </span>
                  </div>
                  <span>{idea.author.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold">Ready to evolve your ideas?</h2>
          <p className="mt-4 text-gray-400 text-lg">
            Join IdeaPark and let AI Agents help bring your ideas to life.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <Link href="/register" className="btn-primary text-base px-8 py-3">
              Create Your Account
            </Link>
            <Link href="/agents" className="btn-ghost text-white hover:text-white hover:bg-white/10 text-base px-8 py-3">
              Explore Agents
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
