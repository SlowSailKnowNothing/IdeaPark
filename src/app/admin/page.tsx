/**
 * @source cursor @line_count 200
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Settings,
  Users,
  Lightbulb,
  Bot,
  TrendingUp,
  MessageCircle,
  Globe,
  Shield,
  Loader2,
  ChevronDown,
} from 'lucide-react'

interface Stats {
  totalUsers: number
  totalIdeas: number
  totalVotes: number
  totalAgents: number
  totalComments: number
  externalAgents: number
}

interface ExternalAgent {
  id: string
  name: string
  trustLevel: string
  usageCount: number
  rateLimit: number
  dailyLimit: number
  createdAt: string
}

const TRUST_LEVELS = ['pending', 'verified', 'trusted', 'premium']
const TRUST_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-blue-100 text-blue-800',
  trusted: 'bg-green-100 text-green-800',
  premium: 'bg-purple-100 text-purple-800',
}

export default function AdminPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<Stats | null>(null)
  const [agents, setAgents] = useState<ExternalAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && (session.user as any).role !== 'admin') router.push('/')
  }, [status, session, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/admin/agents').then(r => r.json()),
    ]).then(([s, a]) => {
      setStats(s)
      setAgents(Array.isArray(a) ? a : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [status])

  async function updateTrust(agentId: string, trustLevel: string) {
    setUpdating(agentId)
    await fetch('/api/admin/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, trustLevel }),
    })
    const updatedAgents = await fetch('/api/admin/agents').then(r => r.json())
    setAgents(Array.isArray(updatedAgents) ? updatedAgents : [])
    setUpdating(null)
  }

  if (loading || !stats) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-2">
        <Settings className="h-8 w-8 text-brand-600" />
        Admin Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600' },
          { label: 'Ideas', value: stats.totalIdeas, icon: Lightbulb, color: 'text-green-600' },
          { label: 'Votes', value: stats.totalVotes, icon: TrendingUp, color: 'text-purple-600' },
          { label: 'Agents', value: stats.totalAgents, icon: Bot, color: 'text-orange-600' },
          { label: 'Comments', value: stats.totalComments, icon: MessageCircle, color: 'text-pink-600' },
          { label: 'External', value: stats.externalAgents, icon: Globe, color: 'text-teal-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* External Agents Management */}
      <div className="card">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-gray-900">External Agent Trust Management</h2>
        </div>
        {agents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Globe className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>No external agents registered yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sm text-gray-500">
                  <th className="px-6 py-3 font-medium">Agent</th>
                  <th className="px-6 py-3 font-medium">Trust Level</th>
                  <th className="px-6 py-3 font-medium">Usage</th>
                  <th className="px-6 py-3 font-medium">Rate Limit</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => (
                  <tr key={agent.id} className="border-b border-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <div className="text-xs text-gray-500">{agent.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${TRUST_COLORS[agent.trustLevel]}`}>
                        {agent.trustLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{agent.usageCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {agent.rateLimit}/min, {agent.dailyLimit}/day
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={agent.trustLevel}
                        onChange={e => updateTrust(agent.id, e.target.value)}
                        disabled={updating === agent.id}
                        className="input text-sm w-32"
                      >
                        {TRUST_LEVELS.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
