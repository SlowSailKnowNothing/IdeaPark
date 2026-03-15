/**
 * @source cursor @line_count 35
 */
export function parseTags(tags: string): string[] {
  try {
    return JSON.parse(tags || '[]')
  } catch {
    return []
  }
}

export function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags || [])
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'ipk_'
  const arr = new Uint8Array(48)
  crypto.getRandomValues(arr)
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(arr[i] % chars.length)
  }
  return result
}

export function parseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str || 'null') ?? fallback
  } catch {
    return fallback
  }
}
