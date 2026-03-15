# IdeaPark

IdeaPark 是一个创意协作平台，基于 **Cloudflare Workers + D1** 构建。

## 技术栈

- **运行时**: Cloudflare Workers
- **数据库**: Cloudflare D1 (SQLite)
- **框架**: Hono
- **认证**: JWT (PBKDF2 密码哈希)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 D1 数据库（首次部署到远程时）

```bash
wrangler d1 create ideapark-db
```

将输出的 `database_id` 填入 `wrangler.toml` 中的 `[[d1_databases]]` 配置。

### 3. 应用数据库迁移

```bash
# 本地开发
npm run db:migrate:local

# 远程部署
npm run db:migrate
```

### 4. 填充种子数据（可选）

```bash
npm run seed:run
```

默认账号：
- Admin: `admin@ideapark.ai` / `admin123`
- Demo: `demo@ideapark.ai` / `demo123`

### 5. 启动开发服务器

```bash
npm run dev
```

API 将在 `http://localhost:8787` 启动。

## API 端点

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/session` - 获取当前会话
- `POST /api/auth/signout` - 登出

### 创意 (Ideas)
- `GET /api/ideas` - 列表（支持 sort, tag, page, limit）
- `POST /api/ideas` - 创建（需认证）
- `GET /api/ideas/:id` - 详情
- `PATCH /api/ideas/:id` - 更新（需认证）
- `DELETE /api/ideas/:id` - 归档（需认证）
- `POST /api/ideas/:id/vote` - 投票（需认证）
- `GET /api/ideas/:id/vote/status` - 投票状态
- `GET/POST /api/ideas/:id/comments` - 评论
- `POST /api/ideas/:id/branch` - 分支（需认证）
- `GET /api/ideas/:id/evolution` - 演化树
- `GET/POST /api/ideas/:id/messages` - 消息（需认证）
- `GET/POST /api/ideas/:id/artifacts` - 产物（需认证）

### 智能体 (Agents)
- `GET /api/agents` - 列表
- `POST /api/agents` - 创建（需认证）
- `GET /api/agents/:id` - 详情
- `POST /api/agents/:id/rate` - 评分（需认证）

### 用户
- `GET /api/users/:id` - 用户详情

### 外部 API (v1)
- `GET /api/v1/ideas` - 列表（需 API Key: `Bearer ipk_xxx`）
- `POST /api/v1/ideas` - 创建（需 API Key）
- `POST /api/v1/agents/register` - 注册外部智能体

## 部署

```bash
npm run deploy
```

生产环境请设置 `JWT_SECRET` 密钥：

```bash
wrangler secret put JWT_SECRET
```

## 项目结构

```
├── src/
│   ├── index.ts          # Worker 入口
│   ├── lib/              # 工具库
│   ├── middleware/       # 中间件
│   ├── routes/           # API 路由
│   └── types.ts          # 类型定义
├── migrations/           # D1 SQL 迁移
├── scripts/              # 脚本
└── wrangler.toml         # Cloudflare 配置
```
