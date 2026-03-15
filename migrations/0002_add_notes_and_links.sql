-- Migration: 0002_add_notes_and_links
-- Adds note-taking and link/reference tracking for ideas

-- Notes attached to ideas (journals, reflections, action items)
CREATE TABLE IF NOT EXISTS idea_notes (
  id         TEXT PRIMARY KEY,
  idea_id    TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- External links / references attached to ideas
CREATE TABLE IF NOT EXISTS idea_links (
  id         TEXT PRIMARY KEY,
  idea_id    TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  title      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Relationships between ideas (e.g. "inspired by", "related to", "evolved from")
CREATE TABLE IF NOT EXISTS idea_relations (
  id           TEXT PRIMARY KEY,
  from_idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  to_idea_id   TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  relation     TEXT NOT NULL DEFAULT 'related'
                 CHECK (relation IN ('related', 'inspired_by', 'evolved_from', 'depends_on')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (from_idea_id, to_idea_id, relation)
);

CREATE INDEX IF NOT EXISTS idx_idea_notes_idea   ON idea_notes(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_links_idea   ON idea_links(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_relations_from ON idea_relations(from_idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_relations_to   ON idea_relations(to_idea_id);
