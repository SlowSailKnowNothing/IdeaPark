/**
 * @source cursor @line_count 65
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { optionalAuthMiddleware } from './middleware/auth'
import auth from './routes/auth'
import ideas from './routes/ideas'
import ideasVote from './routes/ideas-vote'
import ideasComments from './routes/ideas-comments'
import ideasBranch from './routes/ideas-branch'
import ideasEvolution from './routes/ideas-evolution'
import ideasMessages from './routes/ideas-messages'
import ideasArtifacts from './routes/ideas-artifacts'
import agents from './routes/agents'
import users from './routes/users'
import v1 from './routes/v1'
import type { Env, Variables } from './types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}))
app.use('/api/*', optionalAuthMiddleware)

app.route('/api/auth', auth)
app.route('/api/ideas', ideas)
app.route('/api/ideas/:id/vote', ideasVote)
app.route('/api/ideas/:id/comments', ideasComments)
app.route('/api/ideas/:id/branch', ideasBranch)
app.route('/api/ideas/:id/evolution', ideasEvolution)
app.route('/api/ideas/:id/messages', ideasMessages)
app.route('/api/ideas/:id/artifacts', ideasArtifacts)
app.route('/api/agents', agents)
app.route('/api/users', users)
app.route('/api/v1', v1)

app.get('/', c => c.json({ name: 'IdeaPark API', version: '0.1.0', stack: 'Cloudflare Workers + D1' }))
app.get('/api', c => c.json({ message: 'IdeaPark API - use /api/ideas, /api/agents, etc.' }))

export default app
