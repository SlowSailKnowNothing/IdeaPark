// @source cursor @line_count 60

import type { Env, Tag, CreateTagRequest } from '../types';
import { generateId, jsonResponse, errorResponse, parseBody } from '../utils/response';

/**
 * @source cursor @line_count 55
 * Routes tag-related HTTP requests.
 */
export async function handleTags(request: Request, env: Env, pathSegments: string[]): Promise<Response> {
  const method = request.method;
  const tagId = pathSegments[1];

  if (!tagId) {
    if (method === 'GET') return listTags(env);
    if (method === 'POST') return createTag(request, env);
  } else {
    if (method === 'GET') return getTag(tagId, env);
    if (method === 'DELETE') return deleteTag(tagId, env);
  }

  return errorResponse('Method not allowed', 405);
}

async function listTags(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT t.*, COUNT(it.idea_id) AS idea_count
     FROM tags t
     LEFT JOIN idea_tags it ON it.tag_id = t.id
     GROUP BY t.id
     ORDER BY t.name ASC`
  ).all<Tag & { idea_count: number }>();

  return jsonResponse({ success: true, data: rows.results });
}

async function getTag(tagId: string, env: Env): Promise<Response> {
  const tag = await env.DB.prepare('SELECT * FROM tags WHERE id = ?').bind(tagId).first<Tag>();
  if (!tag) return errorResponse('Tag not found', 404);
  return jsonResponse({ success: true, data: tag });
}

async function createTag(request: Request, env: Env): Promise<Response> {
  const body = await parseBody<CreateTagRequest>(request);
  if (!body?.name?.trim()) return errorResponse('name is required');

  const existing = await env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(body.name.trim()).first<Tag>();
  if (existing) return jsonResponse({ success: true, data: existing });

  const id = generateId('tag');
  const now = new Date().toISOString();

  await env.DB.prepare('INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)')
    .bind(id, body.name.trim(), now)
    .run();

  const tag = await env.DB.prepare('SELECT * FROM tags WHERE id = ?').bind(id).first<Tag>();
  return jsonResponse({ success: true, data: tag }, 201);
}

async function deleteTag(tagId: string, env: Env): Promise<Response> {
  const existing = await env.DB.prepare('SELECT id FROM tags WHERE id = ?').bind(tagId).first();
  if (!existing) return errorResponse('Tag not found', 404);

  await env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(tagId).run();
  return jsonResponse({ success: true, data: { id: tagId } });
}
