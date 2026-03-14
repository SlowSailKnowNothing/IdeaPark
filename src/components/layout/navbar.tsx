/**
 * @source cursor @line_count 130
 */
'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import {
  Lightbulb,
  Bot,
  Plus,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  Sparkles,
} from 'lucide-react'

export function Navbar() {
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              IdeaPark
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/ideas"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Lightbulb className="h-4 w-4" />
                Ideas
              </Link>
              <Link
                href="/agents"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Bot className="h-4 w-4" />
                Agents
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <Link href="/ideas/new" className="btn-primary gap-1.5">
                  <Plus className="h-4 w-4" />
                  New Idea
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
                      {session.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    {session.user?.name}
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <Link
                        href={`/profile/${(session.user as any).id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setProfileOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                      {(session.user as any).role === 'admin' && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setProfileOpen(false)}
                        >
                          <Settings className="h-4 w-4" />
                          Admin
                        </Link>
                      )}
                      <button
                        onClick={() => signOut()}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pb-4 pt-2 space-y-1">
          <Link href="/ideas" className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100">Ideas</Link>
          <Link href="/agents" className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100">Agents</Link>
          {session ? (
            <>
              <Link href="/ideas/new" className="block rounded-lg px-3 py-2 text-brand-600 font-medium hover:bg-brand-50">New Idea</Link>
              <Link href={`/profile/${(session.user as any).id}`} className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100">Profile</Link>
              <button onClick={() => signOut()} className="block w-full text-left rounded-lg px-3 py-2 text-red-600 hover:bg-red-50">Sign Out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100">Sign In</Link>
              <Link href="/register" className="block rounded-lg px-3 py-2 text-brand-600 font-medium hover:bg-brand-50">Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
