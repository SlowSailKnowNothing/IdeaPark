// @source cursor @line_count 120

export interface Env {
  DB: D1Database;
}

// ── Domain Models ────────────────────────────────────────────────────────────

export type IdeaStatus = 'seed' | 'growing' | 'blooming' | 'archived';

export type RelationType = 'related' | 'inspired_by' | 'evolved_from' | 'depends_on';

export interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface Idea {
  id: string;
  title: string;
  content: string;
  status: IdeaStatus;
  category_id: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface IdeaWithDetails extends Idea {
  category?: Category | null;
  tags: Tag[];
}

export interface IdeaNote {
  id: string;
  idea_id: string;
  content: string;
  created_at: string;
}

export interface IdeaLink {
  id: string;
  idea_id: string;
  url: string;
  title: string | null;
  created_at: string;
}

export interface IdeaRelation {
  id: string;
  from_idea_id: string;
  to_idea_id: string;
  relation: RelationType;
  created_at: string;
}

export interface IdeaHistory {
  id: string;
  idea_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

// ── Request / Response DTOs ──────────────────────────────────────────────────

export interface CreateIdeaRequest {
  title: string;
  content?: string;
  status?: IdeaStatus;
  category_id?: string | null;
  priority?: number;
  tag_ids?: string[];
}

export interface UpdateIdeaRequest {
  title?: string;
  content?: string;
  status?: IdeaStatus;
  category_id?: string | null;
  priority?: number;
  tag_ids?: string[];
}

export interface CreateCategoryRequest {
  name: string;
  color?: string;
}

export interface CreateTagRequest {
  name: string;
}

export interface CreateNoteRequest {
  content: string;
}

export interface CreateLinkRequest {
  url: string;
  title?: string;
}

export interface CreateRelationRequest {
  to_idea_id: string;
  relation: RelationType;
}

export interface ListIdeasQuery {
  status?: IdeaStatus;
  category_id?: string;
  tag_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}
