/**
 * @source cursor @line_count 152
 */
export interface Env {
  DB: D1Database;
}

type IdeaRow = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

const json = (payload: ApiResponse, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });

const normalizedPath = (pathname: string): string => pathname.replace(/\/+$/, "") || "/";

const parseIdeaId = (pathname: string): number | null => {
  const match = normalizedPath(pathname).match(/^\/ideas\/(\d+)$/);
  return match ? Number(match[1]) : null;
};

const parseBody = async <T>(request: Request): Promise<T | null> => {
  try {
    return await request.json<T>();
  } catch {
    return null;
  }
};

const mapIdea = (row: Record<string, unknown> | null): IdeaRow | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
};

const getIdeaById = async (env: Env, id: number): Promise<IdeaRow | null> => {
  const result = await env.DB.prepare(
    "SELECT id, title, content, created_at, updated_at FROM ideas WHERE id = ?1"
  )
    .bind(id)
    .first<Record<string, unknown>>();
  return mapIdea(result);
};

const handleListIdeas = async (env: Env): Promise<Response> => {
  const result = await env.DB.prepare(
    "SELECT id, title, content, created_at, updated_at FROM ideas ORDER BY id DESC"
  ).all<Record<string, unknown>>();
  const data = (result.results ?? []).map((row) => mapIdea(row)).filter((row): row is IdeaRow => row !== null);
  return json({ success: true, data });
};

const handleCreateIdea = async (env: Env, request: Request): Promise<Response> => {
  const body = await parseBody<{ title?: string; content?: string }>(request);
  const title = body?.title?.trim();
  const content = body?.content?.trim() ?? "";
  if (!title) return json({ success: false, error: "title is required" }, { status: 400 });

  const now = new Date().toISOString();
  const insert = await env.DB.prepare(
    "INSERT INTO ideas (title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)"
  )
    .bind(title, content, now, now)
    .run();

  const created = await getIdeaById(env, Number(insert.meta.last_row_id));
  return json({ success: true, data: created }, { status: 201 });
};

const handleUpdateIdea = async (env: Env, request: Request, ideaId: number): Promise<Response> => {
  const body = await parseBody<{ title?: string; content?: string }>(request);
  if (!body || (body.title === undefined && body.content === undefined)) {
    return json({ success: false, error: "title or content is required" }, { status: 400 });
  }
  const title = body.title === undefined ? null : body.title.trim();
  const content = body.content === undefined ? null : body.content;
  if (title !== null && title.length === 0) {
    return json({ success: false, error: "title cannot be empty" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const update = await env.DB.prepare(
    "UPDATE ideas SET title = COALESCE(?1, title), content = COALESCE(?2, content), updated_at = ?3 WHERE id = ?4"
  )
    .bind(title, content, now, ideaId)
    .run();
  if ((update.meta.changes ?? 0) === 0) {
    return json({ success: false, error: "idea not found" }, { status: 404 });
  }

  const updated = await getIdeaById(env, ideaId);
  return json({ success: true, data: updated });
};

const handleDeleteIdea = async (env: Env, ideaId: number): Promise<Response> => {
  const result = await env.DB.prepare("DELETE FROM ideas WHERE id = ?1").bind(ideaId).run();
  if ((result.meta.changes ?? 0) === 0) {
    return json({ success: false, error: "idea not found" }, { status: 404 });
  }
  return json({ success: true, data: { id: ideaId } });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = normalizedPath(url.pathname);

    try {
      if (request.method === "GET" && path === "/health") {
        return json({ success: true, data: { service: "ideapark-workers", status: "ok" } });
      }
      if (request.method === "GET" && path === "/ideas") return handleListIdeas(env);
      if (request.method === "POST" && path === "/ideas") return handleCreateIdea(env, request);

      const ideaId = parseIdeaId(path);
      if (ideaId !== null) {
        if (request.method === "GET") {
          const idea = await getIdeaById(env, ideaId);
          if (!idea) return json({ success: false, error: "idea not found" }, { status: 404 });
          return json({ success: true, data: idea });
        }
        if (request.method === "PUT" || request.method === "PATCH") return handleUpdateIdea(env, request, ideaId);
        if (request.method === "DELETE") return handleDeleteIdea(env, ideaId);
      }
      return json({ success: false, error: "route not found" }, { status: 404 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "internal server error";
      return json({ success: false, error: message }, { status: 500 });
    }
  },
};
