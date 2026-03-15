/**
 * @source cursor @line_count 50
 */
import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyJWT, getJWTSecret } from '../lib/auth'
import type { JWTPayload } from '../types'
import type { Env, Variables } from '../types'

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  const cookieToken = getCookie(c, 'ideapark_session')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const secret = getJWTSecret(c.env)
  const payload = await verifyJWT(token, secret)
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  c.set('user', payload)
  await next()
}

export async function optionalAuthMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  const cookieToken = getCookie(c, 'ideapark_session')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken

  if (token) {
    const secret = getJWTSecret(c.env)
    const payload = await verifyJWT(token, secret)
    if (payload) c.set('user', payload)
  }
  await next()
}

export function getUser(c: Context<{ Bindings: Env; Variables: Variables }>): JWTPayload | undefined {
  return c.get('user') as JWTPayload | undefined
}
