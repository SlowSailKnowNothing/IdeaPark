/**
 * @source cursor @line_count 95
 */
import { hashPassword } from '../src/lib/auth'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

async function main() {
  const adminPassword = await hashPassword('admin123')
  const demoPassword = await hashPassword('demo123')

  const now = new Date().toISOString()
  const adminId = 'seed-admin-001'
  const demoId = 'seed-demo-002'
  const agentIds = ['code-creator', 'doc-writer', 'design-thinker', 'data-analyst']

  const sql = `
-- IdeaPark seed data
INSERT OR IGNORE INTO User (id, email, name, password, role, bio, reputation, createdAt, updatedAt) VALUES
('${adminId}', 'admin@ideapark.ai', 'IdeaPark Admin', '${escapeSql(adminPassword)}', 'admin', 'Platform administrator', 100, '${now}', '${now}'),
('${demoId}', 'demo@ideapark.ai', 'Demo User', '${escapeSql(demoPassword)}', 'user', 'A curious mind exploring IdeaPark', 50, '${now}', '${now}');

INSERT OR REPLACE INTO Agent (id, name, description, systemPrompt, capabilities, avatarEmoji, type, modelName, visibility, creatorId, createdAt, updatedAt) VALUES
('${agentIds[0]}', 'Code Creator', 'Expert in code generation, architecture design, and technical implementation.', 'You are Code Creator, an expert software engineer.', '["code-generation","architecture","debugging","code-review"]', '💻', 'builtin', 'gpt-4', 'public', '${adminId}', '${now}', '${now}'),
('${agentIds[1]}', 'Doc Writer', 'Specializes in documentation, technical writing, and content structuring.', 'You are Doc Writer, a technical writing specialist.', '["documentation","technical-writing","content-structure","editing"]', '📝', 'builtin', 'gpt-4', 'public', '${adminId}', '${now}', '${now}'),
('${agentIds[2]}', 'Design Thinker', 'UX/UI design expert applying design thinking methodology.', 'You are Design Thinker, a UX/UI design expert.', '["ux-design","ui-design","user-research","prototyping"]', '🎨', 'builtin', 'gpt-4', 'public', '${adminId}', '${now}', '${now}'),
('${agentIds[3]}', 'Data Analyst', 'Data analysis and visualization expert.', 'You are Data Analyst, an expert in data analysis.', '["data-analysis","visualization","statistics","dashboards"]', '📊', 'builtin', 'gpt-4', 'public', '${adminId}', '${now}', '${now}');

INSERT OR IGNORE INTO Idea (id, title, description, tags, authorId, agentId, rootId, voteCount, featured, createdAt, updatedAt) VALUES
('seed-idea-1', 'AI-Powered Code Review Assistant', '## Vision

An intelligent code review assistant that learns from your team''s coding patterns and provides contextual suggestions.

## Key Features
- Automated style checks
- Security vulnerability detection
- Performance optimization hints
- Learning from team patterns', '["ai","developer-tools","code-review"]', '${adminId}', '${agentIds[0]}', 'seed-idea-1', 12, 0, '${now}', '${now}'),
('seed-idea-2', 'Community Knowledge Graph', '## Concept

Build a dynamic knowledge graph from community interactions. Every idea, comment, and branch creates connections in a shared knowledge space.

## How It Works
1. Ideas become nodes
2. Branches create edges
3. Tags form clusters
4. Votes weight connections', '["knowledge-graph","community","data-visualization"]', '${demoId}', '${agentIds[3]}', 'seed-idea-2', 8, 0, '${now}', '${now}'),
('seed-idea-3', 'Sustainable Urban Farming Platform', '## Problem

Urban food deserts lack access to fresh produce. Technology can bridge this gap.

## Solution
A platform connecting urban farmers, rooftop gardens, and community kitchens with AI-optimized growing schedules and resource sharing.', '["sustainability","agriculture","community","iot"]', '${demoId}', '${agentIds[2]}', 'seed-idea-3', 15, 1, '${now}', '${now}');

INSERT OR IGNORE INTO Idea (id, title, description, tags, authorId, agentId, parentId, rootId, depth, voteCount, createdAt, updatedAt) VALUES
('seed-idea-4', 'Sustainable Urban Farming Platform — IoT Focus', '## Enhanced Vision

Building on the original concept with a stronger focus on IoT integration.

## Added Features
- Smart soil sensors
- Automated watering systems
- Real-time growth monitoring
- AI crop yield prediction', '["sustainability","agriculture","iot","sensors"]', '${adminId}', '${agentIds[0]}', 'seed-idea-3', 'seed-idea-3', 1, 7, '${now}', '${now}');

UPDATE Idea SET branchCount = 1 WHERE id = 'seed-idea-3';
`

  const seedPath = join(process.cwd(), 'scripts', 'seed.sql')
  writeFileSync(seedPath, sql.trim())

  console.log('Seed SQL written to', seedPath)
  console.log('Running: wrangler d1 migrations apply ideapark-db --local')
  execSync('wrangler d1 migrations apply ideapark-db --local', { stdio: 'inherit' })
  console.log('Running: wrangler d1 execute ideapark-db --local --file=scripts/seed.sql')
  execSync('wrangler d1 execute ideapark-db --local --file=scripts/seed.sql', { stdio: 'inherit', cwd: process.cwd() })
  console.log('Seed completed!')
  console.log('Admin: admin@ideapark.ai / admin123')
  console.log('Demo:  demo@ideapark.ai / demo123')
}

main().catch(console.error)
