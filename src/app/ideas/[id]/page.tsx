/**
 * @source cursor @line_count 380
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  TrendingUp,
  GitBranch,
  MessageCircle,
  Bot,
  ArrowLeft,
  Loader2,
  Send,
  FileCode,
  FileText,
  Palette,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Star,
  Zap,
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
  rootId: string | null
  parentId: string | null
  parent: { id: string; title: string } | null
  createdAt: string
  author: { id: string; name: string; avatar: string | null; reputation: number }
  agent: { id: string; name: string; avatarEmoji: string; description: string } | null
}

interface Comment {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string; avatar: string | null }
  replies: Comment[]
}

interface Message {
  id: string
  role: string
  content: string
  createdAt: string
  agent?: { id: string; name: string; avatarEmoji: string } | null
}

interface Artifact {
  id: string
  title: string
  type: string
  content: string
  language: string | null
  version: number
  createdAt: string
}

interface EvolutionNode {
  id: string
  title: string
  depth: number
  voteCount: number
  authorName: string
  branchCount: number
  children: EvolutionNode[]
  _meta?: { totalVersions: number; totalVotes: number; contributors: number }
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

function EvolutionTreeNode({ node, currentId }: { node: EvolutionNode; currentId: string }) {
  const [expanded, setExpanded] = useState(true)
  const isCurrent = node.id === currentId
  const hasChildren = node.children.length > 0

  return (
    <div className="ml-4 border-l-2 border-gray-200 pl-4">
      <div className={`flex items-center gap-2 py-1.5 rounded-lg px-2 -ml-2 ${isCurrent ? 'bg-brand-50 border border-brand-200' : 'hover:bg-gray-50'}`}>
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Link href={`/ideas/${node.id}`} className={`text-sm font-medium ${isCurrent ? 'text-brand-700' : 'text-gray-700 hover:text-brand-600'}`}>
          {node.title.length > 40 ? node.title.substring(0, 40) + '...' : node.title}
        </Link>
        <span className="flex items-center gap-0.5 text-xs text-gray-500">
          <TrendingUp className="h-3 w-3" /> {node.voteCount}
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <EvolutionTreeNode key={child.id} node={child} currentId={currentId} />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentItem({ comment, ideaId, onReply }: { comment: Comment; ideaId: string; onReply: () => void }) {
  const [showReply, setShowReply] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submitReply() {
    if (!replyContent.trim()) return
    setSubmitting(true)
    await fetch(`/api/ideas/${ideaId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyContent, parentId: comment.id }),
    })
    setReplyContent('')
    setShowReply(false)
    setSubmitting(false)
    onReply()
  }

  return (
    <div className="border-l-2 border-gray-100 pl-4 py-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
          {comment.author.name.charAt(0)}
        </div>
        <span className="text-sm font-medium text-gray-900">{comment.author.name}</span>
        <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
      </div>
      <p className="text-sm text-gray-700 ml-8">{comment.content}</p>
      <button onClick={() => setShowReply(!showReply)} className="ml-8 mt-1 text-xs text-brand-600 hover:text-brand-700">
        Reply
      </button>
      {showReply && (
        <div className="ml-8 mt-2 flex gap-2">
          <input
            className="input flex-1 text-sm"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            onKeyDown={(e) => { if (e.key === 'Enter') submitReply() }}
          />
          <button onClick={submitReply} className="btn-primary text-sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          </button>
        </div>
      )}
      {comment.replies?.map(reply => (
        <CommentItem key={reply.id} comment={reply} ideaId={ideaId} onReply={onReply} />
      ))}
    </div>
  )
}

export default function IdeaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = params.id as string

  const [idea, setIdea] = useState<Idea | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [evolutionTree, setEvolutionTree] = useState<EvolutionNode | null>(null)
  const [treeMeta, setTreeMeta] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [branching, setBranching] = useState(false)

  const [commentInput, setCommentInput] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const fetchIdea = useCallback(() => {
    fetch(`/api/ideas/${id}`).then(r => r.json()).then(setIdea).catch(() => {})
  }, [id])

  const fetchComments = useCallback(() => {
    fetch(`/api/ideas/${id}/comments`).then(r => r.json()).then(setComments).catch(() => {})
  }, [id])

  const fetchMessages = useCallback(() => {
    fetch(`/api/ideas/${id}/messages`).then(r => r.json()).then(setMessages).catch(() => {})
  }, [id])

  const fetchArtifacts = useCallback(() => {
    fetch(`/api/ideas/${id}/artifacts`).then(r => r.json()).then(setArtifacts).catch(() => {})
  }, [id])

  const fetchTree = useCallback(() => {
    fetch(`/api/ideas/${id}/evolution`)
      .then(r => r.json())
      .then(data => {
        setEvolutionTree(data.tree)
        if (data.tree?._meta) setTreeMeta(data.tree._meta)
      })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchIdea(), fetchComments(), fetchMessages(), fetchArtifacts(), fetchTree()])
      .finally(() => setLoading(false))
  }, [fetchIdea, fetchComments, fetchMessages, fetchArtifacts, fetchTree])

  async function handleVote() {
    if (!session) { router.push('/login'); return }
    setVoting(true)
    await fetch(`/api/ideas/${id}/vote`, { method: 'POST' })
    fetchIdea()
    setVoting(false)
  }

  async function handleBranch() {
    if (!session) { router.push('/login'); return }
    setBranching(true)
    const res = await fetch(`/api/ideas/${id}/branch`, { method: 'POST' })
    const data = await res.json()
    setBranching(false)
    if (res.ok) router.push(`/ideas/${data.id}`)
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentInput.trim()) return
    await fetch(`/api/ideas/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentInput }),
    })
    setCommentInput('')
    fetchComments()
    fetchIdea()
  }

  async function handleChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim()) return
    setChatLoading(true)
    const res = await fetch(`/api/ideas/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: chatInput }),
    })
    if (res.ok) {
      const data = await res.json()
      setMessages(prev => [...prev, data.userMessage, data.assistantMessage])
    }
    setChatInput('')
    setChatLoading(false)
  }

  if (loading || !idea) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'workspace', label: 'AI Workspace', icon: Zap },
    { key: 'evolution', label: 'Evolution', icon: GitBranch },
    { key: 'comments', label: `Comments (${comments.length})`, icon: MessageCircle },
  ]

  const typeIcons: Record<string, any> = { code: FileCode, document: FileText, design: Palette, data: BarChart3 }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
            <button onClick={handleVote} disabled={voting} className="flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-brand-50 transition-colors">
              <TrendingUp className={`h-6 w-6 ${voting ? 'text-gray-400' : 'text-brand-600'}`} />
              <span className="text-xl font-bold text-gray-900">{idea.voteCount}</span>
            </button>
          </div>
          <div className="flex-1">
            {idea.parent && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                <GitBranch className="h-3.5 w-3.5" />
                Branched from{' '}
                <Link href={`/ideas/${idea.parent.id}`} className="text-brand-600 hover:underline">{idea.parent.title}</Link>
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{idea.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <div className="h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                  {idea.author.name.charAt(0)}
                </div>
                <Link href={`/profile/${idea.author.id}`} className="hover:text-brand-600">{idea.author.name}</Link>
              </div>
              <span className="text-sm text-gray-400">·</span>
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="h-3.5 w-3.5" /> {formatDate(idea.createdAt)}
              </span>
              {idea.agent && (
                <>
                  <span className="text-sm text-gray-400">·</span>
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    {idea.agent.avatarEmoji} {idea.agent.name}
                  </span>
                </>
              )}
              {idea.featured && <span className="badge-yellow"><Star className="h-3 w-3 mr-1" />Featured</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {parseTags(idea.tags).map(tag => <span key={tag} className="badge-green">{tag}</span>)}
            </div>
          </div>
          <button onClick={handleBranch} disabled={branching} className="btn-secondary gap-1.5 whitespace-nowrap">
            {branching ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
            Branch
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="card p-6">
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {idea.description}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {activeTab === 'workspace' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card flex flex-col" style={{ height: '600px' }}>
            <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand-600" />
              <span className="font-medium text-gray-900">AI Chat</span>
              {idea.agent && <span className="text-sm text-gray-500">with {idea.agent.avatarEmoji} {idea.agent.name}</span>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  <Bot className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Start a conversation with your AI agent to develop this idea.</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role !== 'user' && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-sm">
                      {msg.agent?.avatarEmoji || '🤖'}
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className={msg.role !== 'user' ? 'markdown-body' : ''}>
                      {msg.role === 'user' ? msg.content : <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>}
                    </div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-sm">
                    {idea.agent?.avatarEmoji || '🤖'}
                  </div>
                  <div className="bg-gray-100 rounded-xl px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
            </div>
            {session && (
              <form onSubmit={handleChat} className="border-t border-gray-200 p-4 flex gap-2">
                <input
                  className="input flex-1"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask the AI agent..."
                  disabled={chatLoading}
                />
                <button type="submit" className="btn-primary" disabled={chatLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
          <div className="card flex flex-col" style={{ maxHeight: '600px' }}>
            <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <FileCode className="h-4 w-4 text-brand-600" />
              <span className="font-medium text-gray-900">Artifacts</span>
              <span className="ml-auto text-xs text-gray-500">{artifacts.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {artifacts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No artifacts yet. Chat with the AI agent to generate some!</p>
              ) : (
                <div className="space-y-3">
                  {artifacts.map(artifact => {
                    const Icon = typeIcons[artifact.type] || FileText
                    return (
                      <div key={artifact.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">{artifact.title}</span>
                          <span className="badge-gray ml-auto">v{artifact.version}</span>
                        </div>
                        <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto max-h-32">
                          <code>{artifact.content.substring(0, 500)}</code>
                        </pre>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'evolution' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-brand-600" />
            Evolution Tree
          </h3>
          {treeMeta && (
            <div className="flex gap-6 mb-4 text-sm text-gray-600">
              <span>{treeMeta.totalVersions} versions</span>
              <span>{treeMeta.totalVotes} total votes</span>
              <span>{treeMeta.contributors} contributors</span>
            </div>
          )}
          {evolutionTree ? (
            <EvolutionTreeNode node={evolutionTree} currentId={id} />
          ) : (
            <p className="text-gray-500 text-sm">This idea has no branches yet.</p>
          )}
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="card p-6">
          {session && (
            <form onSubmit={handleComment} className="mb-6 flex gap-2">
              <input
                className="input flex-1"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Share your thoughts..."
              />
              <button type="submit" className="btn-primary" disabled={!commentInput.trim()}>
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
          {comments.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No comments yet. Be the first to share your thoughts!</p>
          ) : (
            <div className="space-y-2">
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} ideaId={id} onReply={fetchComments} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
