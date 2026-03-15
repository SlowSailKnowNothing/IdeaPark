# IdeaPark

A lightweight idea-management REST API built on **Cloudflare Workers** and **D1** (Cloudflare's serverless SQLite database).

---

## Architecture

```
Request
  └─▶ Cloudflare Worker (src/index.ts)
        ├─▶ /api/ideas/*        → handlers/ideas.ts
        ├─▶ /api/categories/*   → handlers/categories.ts
        ├─▶ /api/tags/*         → handlers/tags.ts
        └─▶ /api/health         → inline
                 │
                 ▼
           D1 Database (SQLite)
```

All data is stored in a **Cloudflare D1** database. Schema migrations live in `migrations/`.

---

## Data Model

| Table            | Description                                        |
|------------------|----------------------------------------------------|
| `ideas`          | Core entity – title, content, status, priority     |
| `categories`     | Colour-coded groupings for ideas                   |
| `tags`           | Flexible labels (many-to-many with ideas)          |
| `idea_tags`      | Join table between ideas and tags                  |
| `idea_notes`     | Free-form notes attached to an idea                |
| `idea_links`     | External URLs / references for an idea             |
| `idea_relations` | Typed edges between ideas (inspired_by, etc.)      |
| `idea_history`   | Audit log of field-level changes                   |

### Idea Status Flow

```
seed  →  growing  →  blooming
                 ↘        ↓
                  archived
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) ≥ 3

### Install dependencies

```bash
npm install
```

### Create the D1 database

```bash
# Create the database in your Cloudflare account
npm run db:create
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[ d1_databases ]]
binding = "DB"
database_name = "ideapark-db"
database_id = "<YOUR_DATABASE_ID>"   # ← paste here
```

### Run migrations

```bash
# Apply to remote D1
npm run db:migrate

# Apply to local dev DB
npm run db:migrate:local
```

### Local development

```bash
npm run dev
```

The worker will start at `http://localhost:8787`.

### Deploy

```bash
npm run deploy
```

---

## API Reference

All endpoints are prefixed with `/api`.

### Health

```
GET /api/health
```

---

### Ideas

| Method   | Path                          | Description                    |
|----------|-------------------------------|--------------------------------|
| `GET`    | `/api/ideas`                  | List ideas (filterable)        |
| `POST`   | `/api/ideas`                  | Create an idea                 |
| `GET`    | `/api/ideas/:id`              | Get idea with full details     |
| `PATCH`  | `/api/ideas/:id`              | Update an idea                 |
| `DELETE` | `/api/ideas/:id`              | Delete an idea                 |
| `GET`    | `/api/ideas/:id/notes`        | List notes for an idea         |
| `POST`   | `/api/ideas/:id/notes`        | Add a note                     |
| `GET`    | `/api/ideas/:id/links`        | List links for an idea         |
| `POST`   | `/api/ideas/:id/links`        | Add a link                     |
| `GET`    | `/api/ideas/:id/relations`    | List relations for an idea     |
| `POST`   | `/api/ideas/:id/relations`    | Add a relation                 |

**Query parameters for `GET /api/ideas`:**

| Param         | Type   | Description                                |
|---------------|--------|--------------------------------------------|
| `status`      | string | Filter by status (seed/growing/blooming/archived) |
| `category_id` | string | Filter by category                         |
| `tag_id`      | string | Filter by tag                              |
| `search`      | string | Full-text search on title/content          |
| `limit`       | number | Page size (default 20, max 100)            |
| `offset`      | number | Page offset (default 0)                    |

**Create idea body:**

```json
{
  "title": "My brilliant idea",
  "content": "Details go here…",
  "status": "seed",
  "category_id": "cat_tech",
  "priority": 5,
  "tag_ids": ["tag_abc123", "tag_def456"]
}
```

---

### Categories

| Method   | Path                    | Description             |
|----------|-------------------------|-------------------------|
| `GET`    | `/api/categories`       | List all categories     |
| `POST`   | `/api/categories`       | Create a category       |
| `GET`    | `/api/categories/:id`   | Get a category          |
| `PATCH`  | `/api/categories/:id`   | Update a category       |
| `DELETE` | `/api/categories/:id`   | Delete a category       |

---

### Tags

| Method   | Path              | Description          |
|----------|-------------------|----------------------|
| `GET`    | `/api/tags`       | List all tags        |
| `POST`   | `/api/tags`       | Create a tag         |
| `GET`    | `/api/tags/:id`   | Get a tag            |
| `DELETE` | `/api/tags/:id`   | Delete a tag         |

---

## Project Structure

```
.
├── migrations/
│   ├── 0001_initial_schema.sql   # Core tables
│   └── 0002_add_notes_and_links.sql
├── src/
│   ├── index.ts                  # Worker entry point & router
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces & DTOs
│   ├── handlers/
│   │   ├── ideas.ts              # Ideas CRUD + sub-resources
│   │   ├── categories.ts         # Categories CRUD
│   │   └── tags.ts               # Tags CRUD
│   └── utils/
│       └── response.ts           # JSON helpers, ID generator
├── wrangler.toml                 # Cloudflare Workers configuration
├── tsconfig.json
└── package.json
```
