import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { discoverAIProjects, getRepoReadme, projectDataFromRepo } from "@/lib/github"
import { requireUserId } from "@/lib/auth"
import { getUserDiscoverKeywords } from "@/lib/userSettings"
import type { PaginatedResponse, ProjectListItem } from "@/types"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")))
  const language = searchParams.get("language")
  const difficulty = searchParams.get("difficulty")
  const query = searchParams.get("query")
  const minStars = parseInt(searchParams.get("minStars") ?? "0")

  // 报告按用户独立：未登录用户拿不到任何报告。
  const userId = await requireUserId()
  const reportUserId = userId ?? "__none__"

  const where: Record<string, unknown> = {}

  if (language) {
    where.language = language
  }
  if (minStars > 0) {
    where.stars = { gte: minStars }
  }
  if (query) {
    where.OR = [
      { name: { contains: query } },
      { fullName: { contains: query } },
      { description: { contains: query } },
    ]
  }
  if (difficulty) {
    where.reports = {
      some: { difficulty, userId: reportUserId },
    }
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        reports: {
          where: { userId: reportUserId },
          select: { id: true, summary: true, difficulty: true, generatedAt: true },
          orderBy: { generatedAt: "desc" },
          take: 1,
        },
        favorites: {
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { stars: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.project.count({ where }),
  ])

  const data: ProjectListItem[] = projects.map((p) => ({
    id: p.id,
    githubId: p.githubId,
    name: p.name,
    fullName: p.fullName,
    description: p.description,
    stars: p.stars,
    forks: p.forks,
    language: p.language,
    topics: JSON.parse(p.topics || "[]"),
    license: p.license,
    homepage: p.homepage,
    lastPushedAt: p.lastPushedAt?.toISOString() ?? null,
    lastAnalyzedAt: p.lastAnalyzedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    reports: p.reports.map((r) => ({
      id: r.id,
      summary: r.summary,
      difficulty: r.difficulty,
      generatedAt: r.generatedAt.toISOString(),
    })),
  }))

  const result: PaginatedResponse<ProjectListItem> = {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }

  return Response.json(result)
}

export async function POST(request: NextRequest) {
  // Guard: discovery spends GitHub API quota, require login.
  const userId = await requireUserId()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { action } = await request.json()

  if (action === "discover") {
    // Trigger project discovery — respect the user's custom keywords.
    const keywords = await getUserDiscoverKeywords(userId)
    const repos = await discoverAIProjects(keywords, 3)
    let added = 0

    for (const repo of repos) {
      const existing = await prisma.project.findUnique({
        where: { githubId: repo.id },
      })
      if (!existing) {
        let readme: string | null = null
        try {
          readme = await getRepoReadme(
            repo.full_name.split("/")[0],
            repo.full_name.split("/")[1],
            repo.default_branch
          )
        } catch {
          // noop
        }

        await prisma.project.create({
          data: { ...projectDataFromRepo(repo), readme },
        })
        added++
      }
    }

    return Response.json({ message: `发现并添加了 ${added} 个新项目`, added })
  }

  return Response.json({ error: "Invalid action" }, { status: 400 })
}
