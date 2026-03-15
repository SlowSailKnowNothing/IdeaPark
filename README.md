# IdeaPark

<!-- @source cursor @line_count 72 -->

基建已切换为 **Cloudflare Workers + D1**，当前仓库提供了一套可直接运行的服务端骨架：

- 运行时：Cloudflare Workers
- 数据库：Cloudflare D1 (SQLite)
- 语言：TypeScript
- 迁移目录：`migrations/`
- 入口文件：`src/index.ts`

## 1. 安装依赖

```bash
npm install
```

## 2. 创建 D1 数据库

首次使用请先创建 D1（会输出 `database_id`）：

```bash
npx wrangler d1 create ideapark-db
```

把输出中的 `database_id` 填入 `wrangler.toml` 的 `[[d1_databases]]` 配置中。

## 3. 本地开发

执行本地迁移并启动 Worker：

```bash
npm run d1:migrate:local
npm run dev
```

本地可用接口：

- `GET /health`
- `GET /ideas`
- `POST /ideas`（body: `{ "title": "xxx", "content": "yyy" }`）
- `GET /ideas/:id`
- `PUT /ideas/:id` / `PATCH /ideas/:id`
- `DELETE /ideas/:id`

## 4. 发布到 Cloudflare

先对远端 D1 执行迁移，再部署 Worker：

```bash
npm run d1:migrate:remote
npm run deploy
```

## 5. 项目结构

```txt
.
├── migrations/
│   └── 0001_init.sql
├── src/
│   └── index.ts
├── package.json
├── tsconfig.json
└── wrangler.toml
```

## 6. 备注

- `wrangler.toml` 中 `database_id` 目前是占位符，部署前请替换为真实值。
- 如果你后续有现成业务表结构，只需要在 `migrations/` 下继续新增 SQL 迁移文件并执行迁移即可。
