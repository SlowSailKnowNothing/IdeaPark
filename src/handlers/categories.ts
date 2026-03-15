// @source cursor @line_count 80

import type { Env, Category, CreateCategoryRequest } from '../types';
import { generateId, jsonResponse, errorResponse, parseBody } from '../utils/response';

/**
 * @source cursor @line_count 75
 * Routes category-related HTTP requests.
 */
export async function handleCategories(request: Request, env: Env, pathSegments: string[]): Promise<Response> {
  const method = request.method;
  const categoryId = pathSegments[1];

  if (!categoryId) {
    if (method === 'GET') return listCategories(env);
    if (method === 'POST') return createCategory(request, env);
  } else {
    if (method === 'GET') return getCategory(categoryId, env);
    if (method === 'PUT' || method === 'PATCH') return updateCategory(categoryId, request, env);
    if (method === 'DELETE') return deleteCategory(categoryId, env);
  }

  return errorResponse('Method not allowed', 405);
}

async function listCategories(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT c.*, COUNT(i.id) AS idea_count
     FROM categories c
     LEFT JOIN ideas i ON i.category_id = c.id
     GROUP BY c.id
     ORDER BY c.name ASC`
  ).all<Category & { idea_count: number }>();

  return jsonResponse({ success: true, data: rows.results });
}

async function getCategory(categoryId: string, env: Env): Promise<Response> {
  const category = await env.DB.prepare('SELECT * FROM categories WHERE id = ?')
    .bind(categoryId)
    .first<Category>();

  if (!category) return errorResponse('Category not found', 404);
  return jsonResponse({ success: true, data: category });
}

async function createCategory(request: Request, env: Env): Promise<Response> {
  const body = await parseBody<CreateCategoryRequest>(request);
  if (!body?.name?.trim()) return errorResponse('name is required');

  const id = generateId('cat');
  const now = new Date().toISOString();

  await env.DB.prepare(
    'INSERT INTO categories (id, name, color, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, body.name.trim(), body.color ?? '#6366f1', now).run();

  const category = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<Category>();
  return jsonResponse({ success: true, data: category }, 201);
}

async function updateCategory(categoryId: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(categoryId).first<Category>();
  if (!existing) return errorResponse('Category not found', 404);

  const body = await parseBody<Partial<CreateCategoryRequest>>(request);
  if (!body) return errorResponse('Invalid JSON body');

  const fields: string[] = [];
  const values: string[] = [];

  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name.trim()); }
  if (body.color !== undefined) { fields.push('color = ?'); values.push(body.color); }

  if (fields.length === 0) return errorResponse('No fields to update');

  values.push(categoryId);
  await env.DB.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  const updated = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(categoryId).first<Category>();
  return jsonResponse({ success: true, data: updated });
}

async function deleteCategory(categoryId: string, env: Env): Promise<Response> {
  const existing = await env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(categoryId).first();
  if (!existing) return errorResponse('Category not found', 404);

  await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(categoryId).run();
  return jsonResponse({ success: true, data: { id: categoryId } });
}
