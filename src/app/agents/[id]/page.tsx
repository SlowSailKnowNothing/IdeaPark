/**
 * @source cursor @line_count 160
 */
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Bot,
  Star,
  TrendingUp,
  Loader2,
  ArrowLeft,
  Zap,
  Globe,
  Shield,
  MessageCircle,
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  description: string
  systemPrompt: string
  capabilities: string
  type: string
  avatarEmoji: string
  usageCount: number
  avgRating: number
  ratingCount: number
  trustLevel: string
  createdAt: string
  creator: { id: string; name: string; avatar: string | null } | null
  ratings: { id: string; rating: number; review: string | null; user: { id: string; name: string } }[]
}

function parseCapabilities(caps: string): string[] {
  try { return JSON.parse(caps) } catch { return [] }
}

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = params.id as string

  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [ratingLoading, setRatingLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then(r => r.json())
      .then(data => { setAgent(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function submitRating() {
    if (!rating) return
    setRatingLoading(true)
    await fetch(`/api/agents/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, review: review || undefined }),
    })
    const res = await fetch(`/api/agents/${id}`)
    setAgent(await res.json())
    setRatingLoading(false)
  }

  if (loading || !agent) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
  }

  const trustColors: Record<string, string> = {
    pending: 'badge-yellow',
    verified: 'badge-blue',
    trusted: 'badge-green',
    premium: 'badge-purple',
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card p-8 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-3xl">
            {agent.avatarEmoji}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
              <span className={`badge ${agent.type === 'builtin' ? 'badge-blue' : agent.type === 'external' ? 'badge-purple' : 'badge-gray'}`}>
                {agent.type}
              </span>
              {agent.type === 'external' && (
                <span className={trustColors[agent.trustLevel] || 'badge-gray'}>
                  <Shield className="h-3 w-3 mr-1" />{agent.trustLevel}
                </span>
              )}
            </div>
            <p className="mt-2 text-gray-600">{agent.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {parseCapabilities(agent.capabilities).map(cap => (
                <span key={cap} className="badge-green">{cap}</span>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4" />{agent.usageCount} uses</span>
              {agent.ratingCount > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />{agent.avgRating.toFixed(1)} ({agent.ratingCount} ratings)
                </span>
              )}
              {agent.creator && (
                <span>
                  by <Link href={`/profile/${agent.creator.id}`} className="text-brand-600 hover:underline">{agent.creator.name}</Link>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-3">System Prompt</h3>
          <pre className="text-sm bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-gray-700 max-h-60 overflow-y-auto">{agent.systemPrompt}</pre>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Rate this Agent</h3>
          {session ? (
            <div className="space-y-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)} className="p-1">
                    <Star className={`h-6 w-6 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
              <textarea className="input text-sm" value={review} onChange={e => setReview(e.target.value)} placeholder="Optional review..." rows={2} />
              <button onClick={submitRating} className="btn-primary w-full" disabled={!rating || ratingLoading}>
                {ratingLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Rating
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link> to rate this agent
            </p>
          )}

          {agent.ratings.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <h4 className="text-sm font-medium text-gray-700">Recent Reviews</h4>
              {agent.ratings.map(r => (
                <div key={r.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{r.user.name}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`h-3 w-3 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  {r.review && <p className="text-gray-600 mt-0.5">{r.review}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
