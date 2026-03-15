-- IdeaPark D1 Database Schema

CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    color      TEXT    NOT NULL DEFAULT '#6366f1',
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ideas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL DEFAULT '',
    category_id INTEGER,
    status      TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'done')),
    priority    INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tags (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS idea_tags (
    idea_id INTEGER NOT NULL,
    tag_id  INTEGER NOT NULL,
    PRIMARY KEY (idea_id, tag_id),
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ideas_status      ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_category_id  ON ideas(category_id);
CREATE INDEX IF NOT EXISTS idx_ideas_priority     ON ideas(priority);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at   ON ideas(created_at);
