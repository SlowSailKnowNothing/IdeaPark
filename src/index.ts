/**
 * @source cursor @line_count 210
 */

import type { Env, ApiResponse, CreateIdeaInput, UpdateIdeaInput, CreateCategoryInput, UpdateCategoryInput } from './types';
import {
  listIdeas, getIdea, createIdea, updateIdea, deleteIdea,
  listCategories, createCategory, updateCategory, deleteCategory,
  listTags,
} from './db';
import { renderHTML } from './frontend';

function json<T>(data: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function error(message: string, status = 400): Response {
  return json({ success: false, error: message }, status);
}

function matchRoute(
  method: string,
  pathname: string,
  target: string,
  targetMethod: string,
): Record<string, string> | null {
  if (method !== targetMethod) return null;

  const patternParts = target.split('/');
  const pathParts = pathname.split('/');
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;
    let params: Record<string, string> | null;

    try {
      // ── Ideas ──────────────────────────────────────────────────────────

      if ((params = matchRoute(method, pathname, '/api/ideas', 'GET'))) {
        const status = url.searchParams.get('status') ?? undefined;
        const category_id = url.searchParams.has('category_id')
          ? Number(url.searchParams.get('category_id'))
          : undefined;
        const priority = url.searchParams.has('priority')
          ? Number(url.searchParams.get('priority'))
          : undefined;
        const search = url.searchParams.get('search') ?? undefined;
        const tag = url.searchParams.get('tag') ?? undefined;
        const page = Number(url.searchParams.get('page') ?? '1');
        const page_size = Number(url.searchParams.get('page_size') ?? '20');

        const { ideas, total } = await listIdeas(env.DB, {
          status, category_id, priority, search, tag, page, page_size,
        });
        return json({ success: true, data: ideas, meta: { total, page, page_size } });
      }

      if ((params = matchRoute(method, pathname, '/api/ideas/:id', 'GET'))) {
        const idea = await getIdea(env.DB, Number(params.id));
        if (!idea) return error('Idea not found', 404);
        return json({ success: true, data: idea });
      }

      if ((params = matchRoute(method, pathname, '/api/ideas', 'POST'))) {
        const body = await request.json<CreateIdeaInput>();
        if (!body.title?.trim()) return error('title is required');
        const idea = await createIdea(env.DB, body);
        return json({ success: true, data: idea }, 201);
      }

      if ((params = matchRoute(method, pathname, '/api/ideas/:id', 'PUT')) ||
          (params = matchRoute(method, pathname, '/api/ideas/:id', 'PATCH'))) {
        const body = await request.json<UpdateIdeaInput>();
        const idea = await updateIdea(env.DB, Number(params.id), body);
        if (!idea) return error('Idea not found', 404);
        return json({ success: true, data: idea });
      }

      if ((params = matchRoute(method, pathname, '/api/ideas/:id', 'DELETE'))) {
        const deleted = await deleteIdea(env.DB, Number(params.id));
        if (!deleted) return error('Idea not found', 404);
        return json({ success: true });
      }

      // ── Categories ─────────────────────────────────────────────────────

      if ((params = matchRoute(method, pathname, '/api/categories', 'GET'))) {
        const categories = await listCategories(env.DB);
        return json({ success: true, data: categories });
      }

      if ((params = matchRoute(method, pathname, '/api/categories', 'POST'))) {
        const body = await request.json<CreateCategoryInput>();
        if (!body.name?.trim()) return error('name is required');
        const category = await createCategory(env.DB, body);
        return json({ success: true, data: category }, 201);
      }

      if ((params = matchRoute(method, pathname, '/api/categories/:id', 'PUT')) ||
          (params = matchRoute(method, pathname, '/api/categories/:id', 'PATCH'))) {
        const body = await request.json<UpdateCategoryInput>();
        const category = await updateCategory(env.DB, Number(params.id), body);
        if (!category) return error('Category not found', 404);
        return json({ success: true, data: category });
      }

      if ((params = matchRoute(method, pathname, '/api/categories/:id', 'DELETE'))) {
        const deleted = await deleteCategory(env.DB, Number(params.id));
        if (!deleted) return error('Category not found', 404);
        return json({ success: true });
      }

      // ── Tags ───────────────────────────────────────────────────────────

      if ((params = matchRoute(method, pathname, '/api/tags', 'GET'))) {
        const tags = await listTags(env.DB);
        return json({ success: true, data: tags });
      }

      // ── Health ─────────────────────────────────────────────────────────

      if (pathname === '/api/health') {
        return json({
          success: true,
          data: { service: 'IdeaPark', status: 'healthy', version: '1.0.0' },
        });
      }

      // ── Frontend ───────────────────────────────────────────────────────

      if (method === 'GET' && !pathname.startsWith('/api/')) {
        return new Response(renderHTML(), {
          headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
      }

      return error('Not found', 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      console.error('Unhandled error:', err);
      return error(message, 500);
    }
  },
};
