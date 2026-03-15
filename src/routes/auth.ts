/**
 * @source cursor @line_count 95
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { hashPassword, signJWT, verifyPassword, verifyJWT, getJWTSecret } from '../lib/auth'
import { generateId } from '../lib/utils'
import { getCookie } from 'hono/cookie'
import type { Env } from '../types'

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const auth = new Hono<{ Bindings: Env }>()

auth.post('/register', async c => {
  try {
    const body = await c.req.json()
    const { name, email, password } = registerSchema.parse(body)

    const existing = await c.env.DB.prepare('SELECT id FROM User WHERE email = ?')
      .bind(email)
      .first()
    if (existing) {
      return c.json({ error: 'User already exists with this email' }, 400)
    }

    const hashedPassword = await hashPassword(password)
    const userCount = await c.env.DB.prepare('SELECT COUNT(*) as c FROM User').first()
    const count = (userCount as { c: number })?.c ?? 0
    const role = count === 0 ? 'admin' : 'user'
    const id = generateId()
    const now = new Date().toISOString()

    await c.env.DB.prepare(
      'INSERT INTO User (id, email, name, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(id, email, name, hashedPassword, role, now, now)
      .run()

    return c.json({ id, name, email, role }, 201)
  } catch (e) {
    if (e instanceof z.ZodError) {
      return c.json({ error: e.errors }, 400)
    }
    throw e
  }
})

auth.post('/login', async c => {
  try {
    const body = await c.req.json()
    const { email, password } = loginSchema.parse(body)

    const user = await c.env.DB.prepare(
      'SELECT id, email, name, password, role, avatar FROM User WHERE email = ?'
    )
      .bind(email)
      .first() as { id: string; email: string; name: string; password: string; role: string; avatar: string | null } | null

    if (!user || !(await verifyPassword(password, user.password))) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const secret = getJWTSecret(c.env)
    const token = await signJWT(
      { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
      secret
    )

    const res = c.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
      token,
    })

    res.headers.set(
      'Set-Cookie',
      `ideapark_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    )
    return res
  } catch (e) {
    if (e instanceof z.ZodError) {
      return c.json({ error: e.errors }, 400)
    }
    throw e
  }
})

auth.get('/session', async c => {
  const authHeader = c.req.header('Authorization')
  const cookieToken = getCookie(c, 'ideapark_session')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken

  if (!token) {
    return c.json({ user: null })
  }

  const secret = getJWTSecret(c.env)
  const payload = await verifyJWT(token, secret)
  if (!payload) {
    return c.json({ user: null })
  }

  return c.json({
    user: {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      avatar: payload.avatar,
    },
  })
})

auth.post('/signout', c => {
  const res = c.json({ success: true })
  res.headers.set('Set-Cookie', 'ideapark_session=; Path=/; HttpOnly; Max-Age=0')
  return res
})

export default auth
