# IdeaPark

基于 **Cloudflare Workers + D1** 的想法管理 REST API（TypeScript）。

## 快速开始

```bash
npm install
npx wrangler d1 create ideapark-db   # 将输出的 database_id 写入 wrangler.toml
npm run db:migrate:local               # 本地表结构
npm run dev                            # 本地开发
```

部署：`npm run deploy`，远程库表：`npm run db:migrate:remote`。

## API 概览

- 前缀：`/api`
- 健康检查：`GET /` 或 `GET /api/health`
- 想法：`/api/ideas`（列表/创建）、`/api/ideas/:id`（查/改/删）
- 分类：`/api/categories`
- 标签：`GET /api/tags`

详细参数与请求体见 `src/index.ts` 与 `schema.sql`。
