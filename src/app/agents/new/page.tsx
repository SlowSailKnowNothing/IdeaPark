/**
 * @source cursor @line_count 160
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, X, Plus, Bot } from 'lucide-react'

const EMOJI_OPTIONS = ['🤖', '💻', '📝', '🎨', '📊', '🔬', '🎯', '🚀', '🧠', '⚡', '🔧', '🎮', '🌐', '🛡️', '📦']

export default function NewAgentPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [capInput, setCapInput] = useState('')
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [avatarEmoji, setAvatarEmoji] = useState('🤖')
  const [visibility, setVisibility] = useState('public')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  function addCap() {
    const cap = capInput.trim().toLowerCase()
    if (cap && !capabilities.includes(cap) && capabilities.length < 8) {
      setCapabilities([...capabilities, cap])
      setCapInput('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, systemPrompt, capabilities, avatarEmoji, visibility }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to create agent')
        return
      }
      router.push(`/agents/${data.id}`)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-2">
        <Bot className="h-8 w-8 text-brand-600" />
        Create New Agent
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        <div className="card p-6 space-y-5">
          <div>
            <label className="label">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatarEmoji(emoji)}
                  className={`h-10 w-10 text-xl rounded-lg border-2 flex items-center justify-center transition-colors ${
                    avatarEmoji === emoji ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Name</label>
            <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. API Designer" required maxLength={100} />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[80px]" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this agent do?" required maxLength={1000} />
          </div>

          <div>
            <label className="label">System Prompt</label>
            <textarea className="input min-h-[150px] font-mono text-sm" value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="You are a helpful AI assistant that specializes in..." required />
            <p className="mt-1 text-xs text-gray-500">This prompt defines how the agent behaves in conversations</p>
          </div>

          <div>
            <label className="label">Capabilities (up to 8)</label>
            <div className="flex gap-2">
              <input type="text" className="input flex-1" value={capInput} onChange={e => setCapInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCap() } }} placeholder="e.g. code-generation" />
              <button type="button" onClick={addCap} className="btn-secondary"><Plus className="h-4 w-4" /></button>
            </div>
            {capabilities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {capabilities.map(cap => (
                  <span key={cap} className="badge-blue gap-1">
                    {cap}
                    <button type="button" onClick={() => setCapabilities(capabilities.filter(c => c !== cap))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Visibility</label>
            <select className="input" value={visibility} onChange={e => setVisibility(e.target.value)}>
              <option value="public">Public — Listed in the marketplace</option>
              <option value="private">Private — Only you can use</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Agent
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}
