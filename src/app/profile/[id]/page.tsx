/**
 * @source cursor @line_count 165
 */
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Lightbulb,
  GitBranch,
  TrendingUp,
  Bot,
  Loader2,
  ArrowLeft,
  Calendar,
  Star,
} from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  avatar: string | null
  bio: string | null
  reputation: number
  createdAt: string
  stats: {
    ideas: number
    branches: number
    totalVotes: number
    agents: number
  }
}

interface Idea {
  id: string
  title: string
  voteCount: number
  depth: number
  createdAt: string
  tags: string
}

function parseTags(tags: string): string[] {
  try { return JSON.parse(tags) } catch { return [] }
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ideas')

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${id}`).then(r => r.json()),
      fetch(`/api/ideas?limit=20`).then(r => r.json()),
    ]).then(([user, ideasData]) => {
      setProfile(user)
      const userIdeas = (ideasData.ideas || []).filter((i: any) => i.author.id === id)
      setIdeas(userIdeas)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading || !profile) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card p-8 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-700">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
            {profile.bio && <p className="text-gray-600 mt-0.5">{profile.bio}</p>}
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" />{profile.reputation} reputation</span>
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            { label: 'Ideas', value: profile.stats.ideas, icon: Lightbulb },
            { label: 'Branches', value: profile.stats.branches, icon: GitBranch },
            { label: 'Total Votes', value: profile.stats.totalVotes, icon: TrendingUp },
            { label: 'Agents', value: profile.stats.agents, icon: Bot },
          ].map(s => (
            <div key={s.label} className="text-center">
              <s.icon className="h-5 w-5 mx-auto mb-1 text-brand-600" />
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setTab('ideas')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${tab === 'ideas' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-600'}`}
        >
          Ideas
        </button>
      </div>

      {ideas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Lightbulb className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p>No ideas yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map(idea => (
            <Link key={idea.id} href={`/ideas/${idea.id}`} className="card block p-4 group">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {idea.depth > 0 && <GitBranch className="h-3.5 w-3.5 text-purple-500" />}
                    <h3 className="font-medium text-gray-900 group-hover:text-brand-600">{idea.title}</h3>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {parseTags(idea.tags).slice(0, 3).map(tag => (
                      <span key={tag} className="badge-green text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <TrendingUp className="h-3.5 w-3.5" /> {idea.voteCount}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
