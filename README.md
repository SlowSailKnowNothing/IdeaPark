# IdeaPark

一个基于 **Cloudflare Workers + D1** 构建的想法管理 API 服务。

## 技术栈

- **运行时**: [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- **数据库**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **语言**: TypeScript
- **构建工具**: [Wrangler](https://developers.cloudflare.com/workers/wrangler/)

## 项目结构

```
├── src/
│   ├── index.ts      # Worker 入口 & API 路由
│   ├── db.ts         # 数据库操作函数
│   └── types.ts      # TypeScript 类型定义
├── schema.sql        # D1 数据库建表语句
├── wrangler.toml     # Cloudflare Workers 配置
├── tsconfig.json     # TypeScript 配置
└── package.json      # 依赖与脚本
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 D1 数据库

```bash
npx wrangler d1 create ideapark-db
```

将输出的 `database_id` 更新到 `wrangler.toml` 中。

### 3. 初始化数据库表

```bash
# 本地开发环境
npm run db:migrate:local

# 远程生产环境
npm run db:migrate:remote
```

### 4. 本地开发

```bash
npm run dev
```

### 5. 部署

```bash
npm run deploy
```

## API 接口

所有接口前缀: `/api`

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/` 或 `/api/health` | 服务健康检查 |

### Ideas (想法)

| 方法   | 路径              | 说明         |
|--------|-------------------|-------------|
| GET    | `/api/ideas`      | 获取想法列表 |
| GET    | `/api/ideas/:id`  | 获取单个想法 |
| POST   | `/api/ideas`      | 创建想法     |
| PUT    | `/api/ideas/:id`  | 更新想法     |
| DELETE | `/api/ideas/:id`  | 删除想法     |

**查询参数** (GET `/api/ideas`):
- `status` - 按状态筛选: `draft` / `active` / `archived` / `done`
- `category_id` - 按分类 ID 筛选
- `priority` - 按优先级筛选: `0`-`3`
- `search` - 模糊搜索标题和内容
- `tag` - 按标签名筛选
- `page` - 页码 (默认 1)
- `page_size` - 每页数量 (默认 20, 最大 100)

**创建想法 (POST)**:
```json
{
  "title": "我的新想法",
  "content": "详细描述...",
  "category_id": 1,
  "status": "draft",
  "priority": 2,
  "tags": ["创意", "技术"]
}
```

### Categories (分类)

| 方法   | 路径                   | 说明         |
|--------|------------------------|-------------|
| GET    | `/api/categories`      | 获取分类列表 |
| POST   | `/api/categories`      | 创建分类     |
| PUT    | `/api/categories/:id`  | 更新分类     |
| DELETE | `/api/categories/:id`  | 删除分类     |

### Tags (标签)

| 方法 | 路径         | 说明                     |
|------|-------------|--------------------------|
| GET  | `/api/tags` | 获取标签列表 (含使用计数) |

## 数据模型

### Idea

| 字段        | 类型    | 说明                                    |
|------------|---------|----------------------------------------|
| id         | INTEGER | 主键                                    |
| title      | TEXT    | 标题                                    |
| content    | TEXT    | 内容                                    |
| category_id| INTEGER | 分类 ID (外键)                          |
| status     | TEXT    | 状态: draft/active/archived/done        |
| priority   | INTEGER | 优先级: 0-3                             |
| created_at | TEXT    | 创建时间                                |
| updated_at | TEXT    | 更新时间                                |

### Category

| 字段       | 类型    | 说明     |
|-----------|---------|---------|
| id        | INTEGER | 主键     |
| name      | TEXT    | 分类名   |
| color     | TEXT    | 颜色代码 |

### Tag

| 字段 | 类型    | 说明   |
|-----|---------|-------|
| id  | INTEGER | 主键   |
| name| TEXT    | 标签名 |
