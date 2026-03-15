/**
 * @source cursor @line_count 95
 */
import * as jose from 'jose'
import type { JWTPayload } from '../types'

const DEFAULT_SECRET = 'ideapark-dev-secret-change-in-production'
const SALT_LENGTH = 16
const ITERATIONS = 100000
const KEY_LENGTH = 32

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8
  )
  const saltB64 = btoa(String.fromCharCode(...salt))
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
  return `${saltB64}:${hashB64}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(':')
  if (!saltB64 || !hashB64) return false
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8
  )
  const derivedB64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
  return derivedB64 === hashB64
}

export async function signJWT(payload: JWTPayload, secret: string): Promise<string> {
  const key = await getSigningKey(secret)
  return new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const key = await getSigningKey(secret)
    const { payload } = await jose.jwtVerify(token, key)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

async function getSigningKey(secret: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const data = encoder.encode(secret)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(hash)
}

export function getJWTSecret(env: { JWT_SECRET?: string }): string {
  return env.JWT_SECRET || DEFAULT_SECRET
}
