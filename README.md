# GitHub AI Insight

用 AI（DeepSeek）深度分析 GitHub 上最热门的 AI 开源项目，为中文开发者生成结构化的学习报告——一句话总结、架构解析、竞品对比、关键技术栈、学习路线，一目了然。

线上地址：<https://github-ai-insight.vercel.app>

## 功能

- 🔍 **热门项目追踪**：按话题（LLM、Agent、RAG、Stable Diffusion …）自动发现 GitHub 高星 AI 项目
- 🤖 **AI 深度分析**：DeepSeek 解读 README，生成结构化中文报告（流式输出，实时可见进度）
- ⭐ **收藏管理**：登录后可收藏感兴趣的项目
- 📊 **多维筛选**：按语言、难度、关键词、Star 数过滤
- 🔁 **每日刷新**：Vercel Cron / GitHub Actions 每天自动发现并分析新项目

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16（App Router） |
| 语言 | TypeScript（strict） |
| 数据库 | SQLite（开发）/ Turso libsql（生产），Prisma 7 |
| 认证 | NextAuth（Auth.js v5，GitHub OAuth） |
| AI | DeepSeek API（OpenAI 兼容） |
| UI | Tailwind CSS v4 + shadcn/ui（基于 @base-ui/react） |
| 部署 | Vercel |

## 本地开发

```bash
# 1. 安装依赖（NextAuth beta 与 Next 16 有 peer dep 冲突，必须加此参数）
npm install --legacy-peer-deps

# 2. 配置环境变量
cp .env.example .env
#   填入 AUTH_GITHUB_ID / AUTH_GITHUB_SECRET / AUTH_SECRET
#   （可选）ENCRYPTION_KEY：用于加密存储用户的 DeepSeek Key，不配则复用 AUTH_SECRET
#   生成 AUTH_SECRET：openssl rand -hex 32
#   注意：DeepSeek API Key 无需在此配置——登录后在「设置」页填入即可，加密保存

# 3. 初始化数据库
npx prisma db push      # 建表
npx prisma generate     # 生成 client

# 4. 写入演示数据（无需 GitHub API，含 8 个内置项目）
npm run seed

# 5. 启动开发服务器
npm run dev
```

打开 <http://localhost:3000>。

> 联网拉取真实项目：`npm run seed-github`（从 GitHub 发现项目，建议配置 `GITHUB_TOKEN` 防限流）。

## 目录结构

```
src/
├── app/            # 页面与 API 路由（App Router）
│   ├── api/        # /projects /reports /favorites /cron /auth
│   └── dashboard/  # 项目列表、项目详情
├── components/     # UI 组件
├── lib/            # 业务逻辑：analyzer / github / auth / actions / prompt
└── types/          # 类型定义
prisma/             # schema 与 seed 脚本
```

## 部署（Vercel）

1. 导入仓库到 Vercel
2. 配置环境变量（参考 `.env.example`）：`DATABASE_URL` 用 Turso 地址，务必设置 `CRON_SECRET`
3. `vercel.json` 已配置 build command（`prisma generate && next build`）与每日 cron
4. （可选）在 GitHub 仓库 Settings → Secrets 中添加同名 `CRON_SECRET`，让 `.github/workflows/daily-refresh.yml` 也能触发刷新

## 相关文档

- [`AGENTS.md`](./AGENTS.md) — 给 AI 编程助手的详细项目约定（Next.js 16 破坏性变更、数据库规则、分析管线等）

## License

MIT
