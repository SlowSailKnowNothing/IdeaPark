/**
 * @source cursor @line_count 35
 */
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Navbar } from '@/components/layout/navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IdeaPark — AI-Powered Idea Community',
  description: 'Where Ideas Come to Life with AI. Create, evolve, and collaborate on ideas with AI Agents.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
              <p>IdeaPark — Where Ideas Come to Life with AI</p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}
