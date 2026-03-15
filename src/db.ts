/**
 * @source cursor @line_count 233
 */

import type {
  Env,
  Idea,
  IdeaWithDetails,
  CreateIdeaInput,
  UpdateIdeaInput,
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
  Tag,
} from './types';

// ─── Ideas ───────────────────────────────────────────────────────────────────

export async function listIdeas(
  db: D1Database,
  params: {
    status?: string;
    category_id?: number;
    priority?: number;
    search?: string;
    tag?: string;
    page?: number;
    page_size?: number;
  },
): Promise<{ ideas: IdeaWithDetails[]; total: number }> {
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (params.status) {
    conditions.push('i.status = ?');
    bindings.push(params.status);
  }
  if (params.category_id !== undefined) {
    conditions.push('i.category_id = ?');
    bindings.push(params.category_id);
  }
  if (params.priority !== undefined) {
    conditions.push('i.priority = ?');
    bindings.push(params.priority);
  }
  if (params.search) {
    conditions.push('(i.title LIKE ? OR i.content LIKE ?)');
    const like = `%${params.search}%`;
    bindings.push(like, like);
  }
  if (params.tag) {
    conditions.push(`i.id IN (
      SELECT it.idea_id FROM idea_tags it
      JOIN tags t ON t.id = it.tag_id
      WHERE t.name = ?
    )`);
    bindings.push(params.tag);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM ideas i ${where}`)
    .bind(...bindings)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  const page = params.page ?? 1;
  const pageSize = Math.min(params.page_size ?? 20, 100);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .prepare(
      `SELECT i.*, c.name AS category_name, c.color AS category_color
       FROM ideas i
       LEFT JOIN categories c ON c.id = i.category_id
       ${where}
       ORDER BY i.priority DESC, i.updated_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...bindings, pageSize, offset)
    .all<Idea & { category_name: string | null; category_color: string | null }>();

  const ideas: IdeaWithDetails[] = [];
  for (const row of rows.results) {
    const tagRows = await db
      .prepare(
        `SELECT t.name FROM tags t
         JOIN idea_tags it ON it.tag_id = t.id
         WHERE it.idea_id = ?`,
      )
      .bind(row.id)
      .all<{ name: string }>();

    ideas.push({
      ...row,
      tags: tagRows.results.map((t) => t.name),
    });
  }

  return { ideas, total };
}

export async function getIdea(db: D1Database, id: number): Promise<IdeaWithDetails | null> {
  const row = await db
    .prepare(
      `SELECT i.*, c.name AS category_name, c.color AS category_color
       FROM ideas i
       LEFT JOIN categories c ON c.id = i.category_id
       WHERE i.id = ?`,
    )
    .bind(id)
    .first<Idea & { category_name: string | null; category_color: string | null }>();

  if (!row) return null;

  const tagRows = await db
    .prepare(
      `SELECT t.name FROM tags t
       JOIN idea_tags it ON it.tag_id = t.id
       WHERE it.idea_id = ?`,
    )
    .bind(id)
    .all<{ name: string }>();

  return { ...row, tags: tagRows.results.map((t) => t.name) };
}

export async function createIdea(db: D1Database, input: CreateIdeaInput): Promise<IdeaWithDetails> {
  const result = await db
    .prepare(
      `INSERT INTO ideas (title, content, category_id, status, priority)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(
      input.title,
      input.content ?? '',
      input.category_id ?? null,
      input.status ?? 'draft',
      input.priority ?? 0,
    )
    .run();

  const ideaId = result.meta.last_row_id as number;

  if (input.tags?.length) {
    await syncTags(db, ideaId, input.tags);
  }

  return (await getIdea(db, ideaId))!;
}

export async function updateIdea(
  db: D1Database,
  id: number,
  input: UpdateIdeaInput,
): Promise<IdeaWithDetails | null> {
  const existing = await getIdea(db, id);
  if (!existing) return null;

  const fields: string[] = [];
  const bindings: unknown[] = [];

  if (input.title !== undefined) { fields.push('title = ?'); bindings.push(input.title); }
  if (input.content !== undefined) { fields.push('content = ?'); bindings.push(input.content); }
  if (input.category_id !== undefined) { fields.push('category_id = ?'); bindings.push(input.category_id); }
  if (input.status !== undefined) { fields.push('status = ?'); bindings.push(input.status); }
  if (input.priority !== undefined) { fields.push('priority = ?'); bindings.push(input.priority); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    bindings.push(id);
    await db
      .prepare(`UPDATE ideas SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...bindings)
      .run();
  }

  if (input.tags !== undefined) {
    await syncTags(db, id, input.tags);
  }

  return (await getIdea(db, id))!;
}

export async function deleteIdea(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare('DELETE FROM ideas WHERE id = ?').bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}

async function syncTags(db: D1Database, ideaId: number, tagNames: string[]): Promise<void> {
  await db.prepare('DELETE FROM idea_tags WHERE idea_id = ?').bind(ideaId).run();

  for (const name of tagNames) {
    await db
      .prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)')
      .bind(name)
      .run();

    const tag = await db
      .prepare('SELECT id FROM tags WHERE name = ?')
      .bind(name)
      .first<{ id: number }>();

    if (tag) {
      await db
        .prepare('INSERT OR IGNORE INTO idea_tags (idea_id, tag_id) VALUES (?, ?)')
        .bind(ideaId, tag.id)
        .run();
    }
  }
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function listCategories(db: D1Database): Promise<Category[]> {
  const result = await db
    .prepare('SELECT * FROM categories ORDER BY name')
    .all<Category>();
  return result.results;
}

export async function createCategory(db: D1Database, input: CreateCategoryInput): Promise<Category> {
  const result = await db
    .prepare('INSERT INTO categories (name, color) VALUES (?, ?)')
    .bind(input.name, input.color ?? '#6366f1')
    .run();

  const id = result.meta.last_row_id as number;
  return (await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<Category>())!;
}

export async function updateCategory(
  db: D1Database,
  id: number,
  input: UpdateCategoryInput,
): Promise<Category | null> {
  const existing = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<Category>();
  if (!existing) return null;

  const fields: string[] = [];
  const bindings: unknown[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); bindings.push(input.name); }
  if (input.color !== undefined) { fields.push('color = ?'); bindings.push(input.color); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    bindings.push(id);
    await db
      .prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...bindings)
      .run();
  }

  return (await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<Category>())!;
}

export async function deleteCategory(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export async function listTags(db: D1Database): Promise<(Tag & { count: number })[]> {
  const result = await db
    .prepare(
      `SELECT t.id, t.name, COUNT(it.idea_id) as count
       FROM tags t
       LEFT JOIN idea_tags it ON it.tag_id = t.id
       GROUP BY t.id, t.name
       ORDER BY count DESC, t.name`,
    )
    .all<Tag & { count: number }>();
  return result.results;
}
