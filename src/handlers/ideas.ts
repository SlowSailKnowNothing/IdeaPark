// @source cursor @line_count 280

import type {
  Env,
  Idea,
  IdeaWithDetails,
  CreateIdeaRequest,
  UpdateIdeaRequest,
  ListIdeasQuery,
  ApiResponse,
} from '../types';
import { generateId, jsonResponse, errorResponse, parseBody, getQueryParams } from '../utils/response';

/**
 * @source cursor @line_count 80
 * Retrieves a paginated list of ideas with optional filtering.
 */
async function listIdeas(request: Request, env: Env): Promise<Response> {
  const params = getQueryParams(request.url);
  const query: ListIdeasQuery = {
    status: params.status as ListIdeasQuery['status'],
    category_id: params.category_id,
    tag_id: params.tag_id,
    search: params.search,
    limit: Math.min(Number(params.limit) || 20, 100),
    offset: Number(params.offset) || 0,
  };

  let sql = `
    SELECT DISTINCT i.*, c.name AS category_name, c.color AS category_color
    FROM ideas i
    LEFT JOIN categories c ON i.category_id = c.id
  `;
  const bindings: (string | number)[] = [];
  const conditions: string[] = [];

  if (query.tag_id) {
    sql += ' INNER JOIN idea_tags it ON i.id = it.idea_id';
    conditions.push('it.tag_id = ?');
    bindings.push(query.tag_id);
  }

  if (query.status) {
    conditions.push('i.status = ?');
    bindings.push(query.status);
  }

  if (query.category_id) {
    conditions.push('i.category_id = ?');
    bindings.push(query.category_id);
  }

  if (query.search) {
    conditions.push("(i.title LIKE ? OR i.content LIKE ?)");
    bindings.push(`%${query.search}%`, `%${query.search}%`);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY i.priority DESC, i.created_at DESC';

  // Count query
  const countSql = `SELECT COUNT(*) AS total FROM (${sql})`;
  const countResult = await env.DB.prepare(countSql).bind(...bindings).first<{ total: number }>();
  const total = countResult?.total ?? 0;

  sql += ' LIMIT ? OFFSET ?';
  bindings.push(query.limit!, query.offset!);

  const rows = await env.DB.prepare(sql).bind(...bindings).all<Idea & { category_name?: string; category_color?: string }>();
  const ideas = rows.results ?? [];

  // Attach tags for each idea
  const ideaIds = ideas.map((i) => i.id);
  const ideaWithTags: IdeaWithDetails[] = await attachTags(env, ideas, ideaIds);

  return jsonResponse<{ ideas: IdeaWithDetails[] }>({
    success: true,
    data: { ideas: ideaWithTags },
    meta: { total, limit: query.limit, offset: query.offset },
  });
}

/**
 * @source cursor @line_count 15
 * Attaches tag arrays to a list of ideas.
 */
async function attachTags(
  env: Env,
  ideas: (Idea & { category_name?: string; category_color?: string })[],
  ideaIds: string[]
): Promise<IdeaWithDetails[]> {
  if (ideaIds.length === 0) return ideas.map((i) => ({ ...i, tags: [] }));

  const placeholders = ideaIds.map(() => '?').join(', ');
  const tagRows = await env.DB.prepare(
    `SELECT it.idea_id, t.id, t.name, t.created_at
     FROM idea_tags it
     JOIN tags t ON t.id = it.tag_id
     WHERE it.idea_id IN (${placeholders})`
  )
    .bind(...ideaIds)
    .all<{ idea_id: string; id: string; name: string; created_at: string }>();

  const tagMap: Record<string, { id: string; name: string; created_at: string }[]> = {};
  for (const row of tagRows.results ?? []) {
    if (!tagMap[row.idea_id]) tagMap[row.idea_id] = [];
    tagMap[row.idea_id].push({ id: row.id, name: row.name, created_at: row.created_at });
  }

  return ideas.map((idea) => ({
    ...idea,
    category: idea.category_id
      ? { id: idea.category_id, name: idea.category_name ?? '', color: idea.category_color ?? '', created_at: '' }
      : null,
    tags: tagMap[idea.id] ?? [],
  }));
}

/**
 * @source cursor @line_count 25
 * Retrieves a single idea by ID with all related data.
 */
async function getIdea(ideaId: string, env: Env): Promise<Response> {
  const idea = await env.DB.prepare(
    `SELECT i.*, c.name AS category_name, c.color AS category_color
     FROM ideas i
     LEFT JOIN categories c ON i.category_id = c.id
     WHERE i.id = ?`
  )
    .bind(ideaId)
    .first<Idea & { category_name?: string; category_color?: string }>();

  if (!idea) return errorResponse('Idea not found', 404);

  const [withTags] = await attachTags(env, [idea], [idea.id]);

  const [notes, links, history] = await Promise.all([
    env.DB.prepare('SELECT * FROM idea_notes WHERE idea_id = ? ORDER BY created_at DESC').bind(ideaId).all(),
    env.DB.prepare('SELECT * FROM idea_links WHERE idea_id = ? ORDER BY created_at DESC').bind(ideaId).all(),
    env.DB.prepare('SELECT * FROM idea_history WHERE idea_id = ? ORDER BY changed_at DESC').bind(ideaId).all(),
  ]);

  return jsonResponse({
    success: true,
    data: {
      ...withTags,
      notes: notes.results,
      links: links.results,
      history: history.results,
    },
  });
}

/**
 * @source cursor @line_count 50
 * Creates a new idea and optionally associates tags.
 */
async function createIdea(request: Request, env: Env): Promise<Response> {
  const body = await parseBody<CreateIdeaRequest>(request);
  if (!body) return errorResponse('Invalid JSON body');
  if (!body.title?.trim()) return errorResponse('title is required');

  const id = generateId('idea');
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO ideas (id, title, content, status, category_id, priority, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.title.trim(),
      body.content ?? '',
      body.status ?? 'seed',
      body.category_id ?? null,
      body.priority ?? 0,
      now,
      now
    )
    .run();

  if (body.tag_ids?.length) {
    await assignTags(env, id, body.tag_ids);
  }

  const idea = await env.DB.prepare('SELECT * FROM ideas WHERE id = ?').bind(id).first<Idea>();
  return jsonResponse({ success: true, data: idea }, 201);
}

/**
 * @source cursor @line_count 60
 * Updates an existing idea, tracks changes in history, and syncs tags.
 */
async function updateIdea(ideaId: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.DB.prepare('SELECT * FROM ideas WHERE id = ?').bind(ideaId).first<Idea>();
  if (!existing) return errorResponse('Idea not found', 404);

  const body = await parseBody<UpdateIdeaRequest>(request);
  if (!body) return errorResponse('Invalid JSON body');

  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  const historyRecords: { field: string; old_value: string | null; new_value: string | null }[] = [];

  const trackField = (field: keyof UpdateIdeaRequest, newVal: string | number | null | undefined) => {
    if (newVal === undefined) return;
    const oldVal = String(existing[field as keyof Idea] ?? '');
    const newStr = newVal === null ? null : String(newVal);
    if (oldVal !== (newStr ?? '')) {
      historyRecords.push({ field, old_value: oldVal, new_value: newStr });
    }
    fields.push(`${field} = ?`);
    values.push(newVal);
  };

  if (body.title !== undefined) trackField('title', body.title.trim());
  if (body.content !== undefined) trackField('content', body.content);
  if (body.status !== undefined) trackField('status', body.status);
  if (body.category_id !== undefined) trackField('category_id', body.category_id);
  if (body.priority !== undefined) trackField('priority', body.priority);

  if (fields.length === 0 && !body.tag_ids) {
    return errorResponse('No fields to update');
  }

  const now = new Date().toISOString();
  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(now, ideaId);
    await env.DB.prepare(`UPDATE ideas SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  // Write history
  for (const h of historyRecords) {
    await env.DB.prepare(
      `INSERT INTO idea_history (id, idea_id, field, old_value, new_value, changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(generateId('hist'), ideaId, h.field, h.old_value, h.new_value, now)
      .run();
  }

  if (body.tag_ids !== undefined) {
    await env.DB.prepare('DELETE FROM idea_tags WHERE idea_id = ?').bind(ideaId).run();
    if (body.tag_ids.length > 0) {
      await assignTags(env, ideaId, body.tag_ids);
    }
  }

  const updated = await env.DB.prepare('SELECT * FROM ideas WHERE id = ?').bind(ideaId).first<Idea>();
  return jsonResponse({ success: true, data: updated });
}

/**
 * @source cursor @line_count 10
 * Deletes an idea by ID (cascades to related records via FK constraints).
 */
async function deleteIdea(ideaId: string, env: Env): Promise<Response> {
  const existing = await env.DB.prepare('SELECT id FROM ideas WHERE id = ?').bind(ideaId).first();
  if (!existing) return errorResponse('Idea not found', 404);

  await env.DB.prepare('DELETE FROM ideas WHERE id = ?').bind(ideaId).run();
  return jsonResponse({ success: true, data: { id: ideaId } });
}

/**
 * @source cursor @line_count 12
 * Inserts multiple tag associations for an idea.
 */
async function assignTags(env: Env, ideaId: string, tagIds: string[]): Promise<void> {
  const stmts = tagIds.map((tagId) =>
    env.DB.prepare('INSERT OR IGNORE INTO idea_tags (idea_id, tag_id) VALUES (?, ?)').bind(ideaId, tagId)
  );
  await env.DB.batch(stmts);
}

/**
 * @source cursor @line_count 30
 * Routes incoming requests to the appropriate idea handler.
 */
export async function handleIdeas(request: Request, env: Env, pathSegments: string[]): Promise<Response> {
  const method = request.method;
  // pathSegments: ['ideas'] | ['ideas', ':id'] | ['ideas', ':id', 'notes'] etc.
  const ideaId = pathSegments[1];
  const subResource = pathSegments[2];

  if (!ideaId) {
    if (method === 'GET') return listIdeas(request, env);
    if (method === 'POST') return createIdea(request, env);
  } else if (!subResource) {
    if (method === 'GET') return getIdea(ideaId, env);
    if (method === 'PUT' || method === 'PATCH') return updateIdea(ideaId, request, env);
    if (method === 'DELETE') return deleteIdea(ideaId, env);
  } else if (subResource === 'notes') {
    return handleNotes(ideaId, request, env);
  } else if (subResource === 'links') {
    return handleLinks(ideaId, request, env);
  } else if (subResource === 'relations') {
    return handleRelations(ideaId, request, env);
  }

  return errorResponse('Method not allowed', 405);
}

/**
 * @source cursor @line_count 25
 * Handles CRUD for idea notes sub-resource.
 */
async function handleNotes(ideaId: string, request: Request, env: Env): Promise<Response> {
  const method = request.method;

  if (method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT * FROM idea_notes WHERE idea_id = ? ORDER BY created_at DESC'
    ).bind(ideaId).all();
    return jsonResponse({ success: true, data: rows.results });
  }

  if (method === 'POST') {
    const body = await parseBody<{ content: string }>(request);
    if (!body?.content) return errorResponse('content is required');
    const id = generateId('note');
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO idea_notes (id, idea_id, content, created_at) VALUES (?, ?, ?, ?)'
    ).bind(id, ideaId, body.content, now).run();
    const note = await env.DB.prepare('SELECT * FROM idea_notes WHERE id = ?').bind(id).first();
    return jsonResponse({ success: true, data: note }, 201);
  }

  return errorResponse('Method not allowed', 405);
}

/**
 * @source cursor @line_count 25
 * Handles CRUD for idea links sub-resource.
 */
async function handleLinks(ideaId: string, request: Request, env: Env): Promise<Response> {
  const method = request.method;

  if (method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT * FROM idea_links WHERE idea_id = ? ORDER BY created_at DESC'
    ).bind(ideaId).all();
    return jsonResponse({ success: true, data: rows.results });
  }

  if (method === 'POST') {
    const body = await parseBody<{ url: string; title?: string }>(request);
    if (!body?.url) return errorResponse('url is required');
    const id = generateId('link');
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO idea_links (id, idea_id, url, title, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, ideaId, body.url, body.title ?? null, now).run();
    const link = await env.DB.prepare('SELECT * FROM idea_links WHERE id = ?').bind(id).first();
    return jsonResponse({ success: true, data: link }, 201);
  }

  return errorResponse('Method not allowed', 405);
}

/**
 * @source cursor @line_count 25
 * Handles CRUD for idea relations sub-resource.
 */
async function handleRelations(ideaId: string, request: Request, env: Env): Promise<Response> {
  const method = request.method;

  if (method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT ir.*, i.title AS to_idea_title
       FROM idea_relations ir
       JOIN ideas i ON i.id = ir.to_idea_id
       WHERE ir.from_idea_id = ?
       ORDER BY ir.created_at DESC`
    ).bind(ideaId).all();
    return jsonResponse({ success: true, data: rows.results });
  }

  if (method === 'POST') {
    const body = await parseBody<{ to_idea_id: string; relation?: string }>(request);
    if (!body?.to_idea_id) return errorResponse('to_idea_id is required');
    const id = generateId('rel');
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT OR IGNORE INTO idea_relations (id, from_idea_id, to_idea_id, relation, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, ideaId, body.to_idea_id, body.relation ?? 'related', now).run();
    const relation = await env.DB.prepare('SELECT * FROM idea_relations WHERE id = ?').bind(id).first();
    return jsonResponse({ success: true, data: relation }, 201);
  }

  return errorResponse('Method not allowed', 405);
}
