/**
 * @source cursor @line_count 170
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Lightbulb,
  TrendingUp,
  Clock,
  Star,
  GitBranch,
  MessageCircle,
  Plus,
  Search,
  Loader2,
} from 'lucide-react'

interface Idea {
  id: string
  title: string
  description: string
  tags: string
  voteCount: number
  commentCount: number
  branchCount: number
  depth: number
  featured: boolean
  createdAt: string
  author: { id: string; name: string; avatar: string | null }
  agent: { id: string; name: string; avatarEmoji: string } | null
}

function parseTags(tags: string): string[] {
  try { return JSON.parse(tags) } catch { return [] }
}

function formatDate(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [sort, setSort] = useState('hot')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/ideas?sort=${sort}&limit=20`)
      .then(r => r.json())
      .then(data => {
        setIdeas(data.ideas || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sort])

  const sortOptions = [
    { key: 'hot', label: 'Hot', icon: TrendingUp },
    { key: 'new', label: 'Latest', icon: Clock },
    { key: 'featured', label: 'Featured', icon: Star },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ideas</h1>
          <p className="mt-1 text-gray-600">Explore and evolve community ideas</p>
        </div>
        <Link href="/ideas/new" className="btn-primary gap-1.5">
          <Plus className="h-4 w-4" />
          New Idea
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              sort === opt.key
                ? 'bg-brand-100 text-brand-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <opt.icon className="h-4 w-4" />
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-20">
          <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No ideas yet</h3>
          <p className="mt-1 text-gray-600">Be the first to share an idea!</p>
          <Link href="/ideas/new" className="btn-primary mt-4 inline-flex">
            Create Idea
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea) => (
            <Link key={idea.id} href={`/ideas/${idea.id}`} className="card block p-6 group">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                  <TrendingUp className="h-5 w-5 text-brand-600" />
                  <span className="text-lg font-bold text-gray-900">{idea.voteCount}</span>
                  <span className="text-xs text-gray-500">votes</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {idea.depth > 0 && (
                      <span className="badge-purple">
                        <GitBranch className="h-3 w-3 mr-1" />
                        Branch
                      </span>
                    )}
                    {idea.featured && (
                      <span className="badge-yellow">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                    {idea.title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {idea.description.replace(/[#*`\[\]]/g, '').substring(0, 200)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {parseTags(idea.tags).slice(0, 4).map((tag) => (
                        <span key={tag} className="badge-green">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 ml-auto">
                      {idea.agent && (
                        <span className="flex items-center gap-1" title={idea.agent.name}>
                          {idea.agent.avatarEmoji}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {idea.commentCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3.5 w-3.5" />
                        {idea.branchCount}
                      </span>
                      <span>{idea.author.name}</span>
                      <span>{formatDate(idea.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
