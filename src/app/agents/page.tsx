/**
 * @source cursor @line_count 175
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  Bot,
  Plus,
  Star,
  TrendingUp,
  Loader2,
  Search,
  Zap,
  Globe,
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  description: string
  capabilities: string
  type: string
  avatarEmoji: string
  usageCount: number
  avgRating: number
  ratingCount: number
  trustLevel: string
  visibility: string
  creator: { id: string; name: string; avatar: string | null } | null
}

function parseCapabilities(caps: string): string[] {
  try { return JSON.parse(caps) } catch { return [] }
}

export default function AgentsPage() {
  const { data: session } = useSession()
  const [agents, setAgents] = useState<Agent[]>([])
  const [sort, setSort] = useState('popular')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ sort, limit: '50' })
    if (typeFilter) params.set('type', typeFilter)
    fetch(`/api/agents?${params}`)
      .then(r => r.json())
      .then(data => { setAgents(data.agents || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sort, typeFilter])

  const sortOptions = [
    { key: 'popular', label: 'Most Used' },
    { key: 'rating', label: 'Top Rated' },
    { key: 'new', label: 'Newest' },
  ]

  const typeOptions = [
    { key: '', label: 'All' },
    { key: 'builtin', label: 'Built-in' },
    { key: 'community', label: 'Community' },
    { key: 'external', label: 'External' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="h-8 w-8 text-brand-600" />
            Agent Marketplace
          </h1>
          <p className="mt-1 text-gray-600">Discover AI Agents to power your ideas</p>
        </div>
        {session && (
          <Link href="/agents/new" className="btn-primary gap-1.5">
            <Plus className="h-4 w-4" />
            Create Agent
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          {sortOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === opt.key ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="h-6 border-l border-gray-300" />
        <div className="flex items-center gap-2">
          {typeOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setTypeFilter(opt.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === opt.key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20">
          <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No agents found</h3>
          <p className="mt-1 text-gray-600">Be the first to create an agent!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map(agent => (
            <Link key={agent.id} href={`/agents/${agent.id}`} className="card p-6 group">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-2xl flex-shrink-0">
                  {agent.avatarEmoji}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                    {agent.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`badge ${
                      agent.type === 'builtin' ? 'badge-blue' :
                      agent.type === 'external' ? 'badge-purple' : 'badge-gray'
                    }`}>
                      {agent.type === 'builtin' ? <Zap className="h-3 w-3 mr-1" /> :
                       agent.type === 'external' ? <Globe className="h-3 w-3 mr-1" /> : null}
                      {agent.type}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{agent.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {parseCapabilities(agent.capabilities).slice(0, 3).map(cap => (
                  <span key={cap} className="badge-green text-xs">{cap}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {agent.usageCount} uses
                </span>
                {agent.ratingCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500" />
                    {agent.avgRating.toFixed(1)} ({agent.ratingCount})
                  </span>
                )}
                {agent.creator && (
                  <span className="text-xs">by {agent.creator.name}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
