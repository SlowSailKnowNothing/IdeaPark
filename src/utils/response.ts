// @source cursor @line_count 60

import type { ApiResponse } from '../types';

/**
 * @source cursor @line_count 8
 * Generates a URL-safe random ID with a given prefix.
 */
export function generateId(prefix: string): string {
  const random = crypto.getRandomValues(new Uint8Array(12));
  const hex = Array.from(random, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}

/**
 * @source cursor @line_count 12
 * Builds a JSON Response with proper headers.
 */
export function jsonResponse<T>(
  payload: ApiResponse<T>,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
}

/**
 * @source cursor @line_count 8
 * Returns a standardised error response.
 */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse<never>({ success: false, error: message }, status);
}

/**
 * @source cursor @line_count 10
 * Safely parses request body as JSON, returning null on failure.
 */
export async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * @source cursor @line_count 10
 * Extracts query parameters from a URL into a plain object.
 */
export function getQueryParams(url: string): Record<string, string> {
  const { searchParams } = new URL(url);
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
