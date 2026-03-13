/**
 * @source cursor @line_count 190
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, X, Plus, Bot } from 'lucide-react'

interface Agent {
  id: string
  name: string
  avatarEmoji: string
  description: string
  type: string
}

export default function NewIdeaPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [visibility, setVisibility] = useState('public')
  const [agentId, setAgentId] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    fetch('/api/agents?limit=50')
      .then(r => r.json())
      .then(data => setAgents(data.agents || []))
      .catch(() => {})
  }, [])

  function addTag() {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          tags,
          visibility,
          agentId: agentId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to create idea')
        return
      }

      router.push(`/ideas/${data.id}`)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Idea</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="card p-6 space-y-5">
          <div>
            <label className="label">Title</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A clear, compelling title for your idea"
              required
              maxLength={200}
            />
          </div>

          <div>
            <label className="label">Description (Markdown supported)</label>
            <textarea
              className="input min-h-[200px] font-mono text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="## What's the idea?&#10;&#10;Describe your idea in detail...&#10;&#10;## Why it matters&#10;&#10;Explain the problem it solves..."
              required
            />
          </div>

          <div>
            <label className="label">Tags (up to 5)</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Add a tag and press Enter"
              />
              <button type="button" onClick={addTag} className="btn-secondary">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="badge-green gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Visibility</label>
            <select
              className="input"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="public">Public — Visible to everyone</option>
              <option value="private">Private — Only visible to you</option>
            </select>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Bot className="h-4 w-4" />
              AI Agent (optional)
            </label>
            <select
              className="input"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              <option value="">No agent — plain idea</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.avatarEmoji} {agent.name} — {agent.description.substring(0, 60)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Bind an AI Agent to help develop this idea in the workspace
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Publish Idea
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
