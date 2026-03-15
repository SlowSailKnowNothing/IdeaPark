// @source cursor @line_count 80

import type { Env } from './types';
import { handleIdeas } from './handlers/ideas';
import { handleCategories } from './handlers/categories';
import { handleTags } from './handlers/tags';
import { jsonResponse, errorResponse } from './utils/response';

/**
 * @source cursor @line_count 70
 * Main Cloudflare Worker entry point — routes all incoming requests.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    // Strip leading slash and split into segments: /api/ideas/123 → ['api', 'ideas', '123']
    const segments = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean);

    // Expect /api/<resource>/...
    if (segments[0] !== 'api') {
      return errorResponse('Not found', 404);
    }

    const resource = segments[1];
    const pathSegments = segments.slice(1); // ['ideas', '123', ...]

    try {
      switch (resource) {
        case 'ideas':
          return await handleIdeas(request, env, pathSegments);

        case 'categories':
          return await handleCategories(request, env, pathSegments);

        case 'tags':
          return await handleTags(request, env, pathSegments);

        case 'health':
          return jsonResponse({
            success: true,
            data: {
              status: 'ok',
              timestamp: new Date().toISOString(),
              version: '1.0.0',
            },
          });

        default:
          return errorResponse('Not found', 404);
      }
    } catch (err) {
      console.error('[IdeaPark Worker Error]', err);
      return errorResponse(
        err instanceof Error ? err.message : 'Internal server error',
        500
      );
    }
  },
};
