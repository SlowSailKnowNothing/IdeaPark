-- Migration: 0001_initial_schema
-- Creates the core tables for IdeaPark

-- Categories for organizing ideas
CREATE TABLE IF NOT EXISTS categories (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  color     TEXT NOT NULL DEFAULT '#6366f1',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ideas table - the core entity
CREATE TABLE IF NOT EXISTS ideas (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'seed'
                CHECK (status IN ('seed', 'growing', 'blooming', 'archived')),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  priority    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tags for flexible labeling
CREATE TABLE IF NOT EXISTS tags (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Many-to-many relationship between ideas and tags
CREATE TABLE IF NOT EXISTS idea_tags (
  idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (idea_id, tag_id)
);

-- Idea evolution history (tracks status changes and content edits)
CREATE TABLE IF NOT EXISTS idea_history (
  id         TEXT PRIMARY KEY,
  idea_id    TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  field      TEXT NOT NULL,
  old_value  TEXT,
  new_value  TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed default categories
INSERT OR IGNORE INTO categories (id, name, color) VALUES
  ('cat_tech',     'Technology',  '#3b82f6'),
  ('cat_biz',      'Business',    '#10b981'),
  ('cat_creative', 'Creative',    '#f59e0b'),
  ('cat_personal', 'Personal',    '#8b5cf6'),
  ('cat_research', 'Research',    '#ef4444');

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ideas_status      ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_category    ON ideas(category_id);
CREATE INDEX IF NOT EXISTS idx_ideas_priority    ON ideas(priority DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at  ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_idea_history_idea ON idea_history(idea_id);
