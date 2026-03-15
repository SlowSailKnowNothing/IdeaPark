/**
 * @source cursor @line_count 75
 */

export interface Env {
  DB: D1Database;
}

export interface Idea {
  id: number;
  title: string;
  content: string;
  category_id: number | null;
  status: IdeaStatus;
  priority: number;
  created_at: string;
  updated_at: string;
}

export type IdeaStatus = 'draft' | 'active' | 'archived' | 'done';

export interface IdeaWithDetails extends Idea {
  category_name: string | null;
  category_color: string | null;
  tags: string[];
}

export interface CreateIdeaInput {
  title: string;
  content?: string;
  category_id?: number | null;
  status?: IdeaStatus;
  priority?: number;
  tags?: string[];
}

export interface UpdateIdeaInput {
  title?: string;
  content?: string;
  category_id?: number | null;
  status?: IdeaStatus;
  priority?: number;
  tags?: string[];
}

export interface Category {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    page_size?: number;
  };
}
