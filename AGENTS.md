# AGENTS.md — GitHub AI Insight

> AI coding agents: read this first before making any changes.

---

## Project Identity

- **Name**: GitHub AI Insight
- **Purpose**: AI-powered deep analysis of trending GitHub open-source AI projects
- **Users**: Chinese-speaking developers learning AI/ML
- **URL**: https://github-ai-insight.vercel.app
- **Repo**: https://github.com/ZomiCC/AI-Insight

---

## Tech Stack (Do NOT change without discussion)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.9 |
| Language | TypeScript | strict mode |
| Database | SQLite (dev) / Turso libsql (prod) | via Prisma 7.8.0 |
| ORM | Prisma | 7.8.0 + @prisma/adapter-libsql |
| Auth | NextAuth (Auth.js) | 5.0.0-beta.31 |
| AI | DeepSeek API (OpenAI-compatible) | deepseek-chat |
| UI | Tailwind CSS + shadcn/ui | v4 + v4.11 (base-ui, NOT radix) |
| Diagrams | Mermaid (fallback only, not primary) | latest |
| Deployment | Vercel | Hobby plan |
| Cron | GitHub Actions | daily-refresh.yml |

---

## Critical Next.js 16 Breaking Changes

### 1. `middleware.ts` → `proxy.ts`
Do NOT create `src/middleware.ts`. Use `src/proxy.ts` with:
```ts
export async function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] }
```

### 2. `searchParams` is now a Promise
In page components:
```ts
// ❌ Wrong
export default function Page({ searchParams }: { searchParams: { q: string } }) {
  const q = searchParams.q
}

// ✅ Correct
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const params = await searchParams
  const q = params.q
}
```

### 3. `params` is now a Promise in route handlers
```ts
// ✅ Correct
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

### 4. `asChild` is REMOVED from shadcn/ui (uses @base-ui/react now)
```tsx
// ❌ Doesn't work anymore
<Button asChild><Link href="/">Home</Link></Button>

// ✅ Use buttonVariants on Link directly
import { buttonVariants } from "@/components/ui/button"
<Link href="/" className={buttonVariants()}>Home</Link>
```

### 5. Inline Server Actions NOT supported in Next.js 16
```tsx
// ❌ Doesn't work
<form action={async () => { "use server"; await doSomething() }}>

// ✅ Export from dedicated file (src/lib/actions.ts)
// file must start with: "use server"
<form action={myServerAction}>
```

---

## Project Structure Conventions

```
src/
├── app/           # Next.js App Router pages & API routes
├── components/    # React components (both server & client)
├── lib/           # Business logic, utilities, server actions
├── types/         # TypeScript interfaces
└── proxy.ts       # Auth middleware (NOT middleware.ts)
```

### Component Rules
- **Client components** must have `"use client"` at top
- **Server components** are default (no directive needed)
- Server Actions go in `src/lib/actions.ts` only (never inline)
- Button-as-link pattern: use `buttonVariants()` + `<Link>`, never `<Button asChild>`

---

## Database

### Local dev
```bash
npx prisma db push    # Apply schema changes
npx prisma generate   # Regenerate client
npm run seed          # Populate with 8 demo projects + DeepSeek analysis
```

### Production (Turso)
- Connection URL stored in Vercel env `DATABASE_URL`
- Schema changes: run `npx prisma db push --url <turso-url>`
- Data persists in Turso cloud, NOT in Vercel filesystem

### Schema rules
- SQLite-compatible types only (no enum, no array columns)
- Arrays stored as JSON strings, parsed on read
- `@unique` required on any field used in `findUnique()`
- Report uses physical delete (deleteMany before create) — one report per project

---

## Authentication

- Provider: GitHub OAuth only
- Config: `src/lib/auth.ts`
- Session check in server components: `const session = await auth()`
- Protected routes: handled by `src/proxy.ts` matcher
- NextAuth models required: User, Account, Session, VerificationToken

---

## AI Analysis Pipeline

### Two paths:
1. **Standard** (`analyzer.ts`) → used by `/api/projects/[id]/analyze` (POST)
2. **Streaming** (`analyzer-stream.ts`) → used by `/api/projects/[id]/analyze/stream` (GET, SSE)

### Report format
- **Primary**: Structured Markdown with Chinese text
- Architecture section uses layered descriptions + arrow flows (`→`)
- Mermaid diagrams are NO LONGER actively generated (kept as fallback renderer only)
- Each step in data flow must include: input → process → output + core purpose

### DeepSeek API
- Endpoint: `https://api.deepseek.com/chat/completions`
- Model: `deepseek-chat`
- Max tokens: 8192
- Streaming: `stream: true` + SSE
- Cost: ~¥0.01 per analysis

---

## UI Patterns

### All buttons wrapped in `<Link>`:
```tsx
<Link href="/target" className={buttonVariants({ variant: "outline", size: "sm" })}>
  Button Text
</Link>
```

### Loading states (always add):
```tsx
{status === "loading" && <Loader2 className="animate-spin" />}
{status === "error" && <XCircle /> + error message + retry button}
{status === "success" && <CheckCircle /> + action confirmation}
```

### DropdownMenu triggers:
```tsx
<DropdownMenuTrigger>
  <div className="... cursor-pointer">Trigger content</div>
</DropdownMenuTrigger>
```
No `asChild` on DropdownMenuTrigger either.

---

## Environment Variables (in .env, NEVER commit)

```
AUTH_GITHUB_ID          # GitHub OAuth App Client ID
AUTH_GITHUB_SECRET      # GitHub OAuth App Client Secret
AUTH_SECRET             # Random string, `openssl rand -hex 32`
AUTH_URL                # https://github-ai-insight.vercel.app (prod) or http://localhost:3000
DEEPSEEK_API_KEY        # NOT used — each user configures their own key on /dashboard/settings (encrypted at rest)
DATABASE_URL            # libsql://... (prod) or file:./dev.db (dev)
```

---

## Common Tasks

```bash
# Development
npm run dev              # Start dev server (localhost:3000)

# Database
npx prisma db push       # Apply schema
npx prisma generate      # Regenerate client
npm run seed             # Populate demo data + analyze 3 projects

# Deployment
npx vercel --prod --yes  # Deploy to production

# Testing analysis
# Visit /dashboard → click "刷新数据" → pick a project → click "重新分析"
```

---

## Known Pitfalls

1. **Never `npm install` without `--legacy-peer-deps`** — NextAuth beta peer deps conflict with Next 16
2. **Vercel functions timeout at 60s** (Hobby) — streaming analysis must complete within this
3. **GitHub API rate limit**: 60 req/hr unauthenticated, 5000 with token — always respect 1s delay between calls
4. **Prisma client import**: `@/generated/prisma/client` (NOT `@prisma/client`)
5. **Don't change the analysis prompt lightly** — it's tuned for DeepSeek's Chinese output quality
6. **SSE on Vercel**: Edge functions don't support streaming; must use Node runtime (default for API routes)
