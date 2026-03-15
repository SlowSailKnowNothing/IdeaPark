-- @source cursor @line_count 11
CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT "",
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_updated_at ON ideas (updated_at DESC);
