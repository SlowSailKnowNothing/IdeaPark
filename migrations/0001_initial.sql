-- @source cursor @line_count 120
-- IdeaPark D1 initial schema (SQLite compatible)

CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  reputation INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_email ON User(email);

CREATE TABLE IF NOT EXISTS Agent (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  systemPrompt TEXT NOT NULL,
  capabilities TEXT NOT NULL DEFAULT '[]',
  modelName TEXT NOT NULL DEFAULT 'gpt-4',
  visibility TEXT NOT NULL DEFAULT 'public',
  type TEXT NOT NULL DEFAULT 'community',
  avatarEmoji TEXT NOT NULL DEFAULT '🤖',
  apiKey TEXT UNIQUE,
  trustLevel TEXT NOT NULL DEFAULT 'pending',
  webhookUrl TEXT,
  agentCardUrl TEXT,
  usageCount INTEGER NOT NULL DEFAULT 0,
  avgRating REAL NOT NULL DEFAULT 0,
  ratingCount INTEGER NOT NULL DEFAULT 0,
  rateLimit INTEGER NOT NULL DEFAULT 10,
  dailyLimit INTEGER NOT NULL DEFAULT 100,
  creatorId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (creatorId) REFERENCES User(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_type ON Agent(type);
CREATE INDEX IF NOT EXISTS idx_agent_trustLevel ON Agent(trustLevel);
CREATE INDEX IF NOT EXISTS idx_agent_creatorId ON Agent(creatorId);
CREATE INDEX IF NOT EXISTS idx_agent_apiKey ON Agent(apiKey);

CREATE TABLE IF NOT EXISTS Idea (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'public',
  status TEXT NOT NULL DEFAULT 'active',
  featured INTEGER NOT NULL DEFAULT 0,
  parentId TEXT,
  rootId TEXT,
  depth INTEGER NOT NULL DEFAULT 0,
  voteCount INTEGER NOT NULL DEFAULT 0,
  commentCount INTEGER NOT NULL DEFAULT 0,
  branchCount INTEGER NOT NULL DEFAULT 0,
  authorId TEXT NOT NULL,
  agentId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parentId) REFERENCES Idea(id),
  FOREIGN KEY (authorId) REFERENCES User(id),
  FOREIGN KEY (agentId) REFERENCES Agent(id)
);

CREATE INDEX IF NOT EXISTS idx_idea_rootId ON Idea(rootId);
CREATE INDEX IF NOT EXISTS idx_idea_parentId ON Idea(parentId);
CREATE INDEX IF NOT EXISTS idx_idea_authorId ON Idea(authorId);
CREATE INDEX IF NOT EXISTS idx_idea_voteCount ON Idea(voteCount);
CREATE INDEX IF NOT EXISTS idx_idea_createdAt ON Idea(createdAt);
CREATE INDEX IF NOT EXISTS idx_idea_status_visibility ON Idea(status, visibility);

CREATE TABLE IF NOT EXISTS Vote (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  ideaId TEXT NOT NULL,
  rootId TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES User(id),
  FOREIGN KEY (ideaId) REFERENCES Idea(id),
  UNIQUE(userId, rootId)
);

CREATE INDEX IF NOT EXISTS idx_vote_ideaId ON Vote(ideaId);
CREATE INDEX IF NOT EXISTS idx_vote_userId ON Vote(userId);

CREATE TABLE IF NOT EXISTS Comment (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  ideaId TEXT NOT NULL,
  authorId TEXT NOT NULL,
  parentId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ideaId) REFERENCES Idea(id),
  FOREIGN KEY (authorId) REFERENCES User(id),
  FOREIGN KEY (parentId) REFERENCES Comment(id)
);

CREATE INDEX IF NOT EXISTS idx_comment_ideaId ON Comment(ideaId);
CREATE INDEX IF NOT EXISTS idx_comment_parentId ON Comment(parentId);

CREATE TABLE IF NOT EXISTS AgentRating (
  id TEXT PRIMARY KEY,
  rating INTEGER NOT NULL,
  review TEXT,
  agentId TEXT NOT NULL,
  userId TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (agentId) REFERENCES Agent(id),
  FOREIGN KEY (userId) REFERENCES User(id),
  UNIQUE(agentId, userId)
);

CREATE TABLE IF NOT EXISTS Message (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  ideaId TEXT NOT NULL,
  userId TEXT,
  agentId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ideaId) REFERENCES Idea(id),
  FOREIGN KEY (userId) REFERENCES User(id),
  FOREIGN KEY (agentId) REFERENCES Agent(id)
);

CREATE INDEX IF NOT EXISTS idx_message_ideaId ON Message(ideaId);

CREATE TABLE IF NOT EXISTS Artifact (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  ideaId TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ideaId) REFERENCES Idea(id)
);

CREATE INDEX IF NOT EXISTS idx_artifact_ideaId ON Artifact(ideaId);
