import { Suspense } from "react"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { ProjectCard, ProjectCardSkeleton } from "@/components/ProjectCard"
import { SearchFilter } from "@/components/SearchFilter"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RefreshCw } from "lucide-react"
import Link from "next/link"
import { discoverProjects } from "@/lib/actions"
import { RefreshButton } from "@/components/RefreshButton"

function PaginationRow({
  page,
  totalPages,
  searchParams,
}: {
  page: number
  totalPages: number
  searchParams: Record<string, string>
}) {
  if (totalPages <= 1) return null

  const buildUrl = (p: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", String(p))
    return `/dashboard?${params.toString()}`
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {page > 1 && (
        <Link
          href={buildUrl(page - 1)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          上一页
        </Link>
      )}
      <span className="text-sm text-muted-foreground px-4">
        {page} / {totalPages}
      </span>
      {page < totalPages && (
        <Link
          href={buildUrl(page + 1)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          下一页
        </Link>
      )}
    </div>
  )
}

async function ProjectList({
  searchParams,
}: {
  searchParams: Record<string, string>
}) {
  const session = await auth()
  const page = Math.max(1, parseInt(searchParams.page ?? "1"))
  const pageSize = 20
  const language = searchParams.language
  const difficulty = searchParams.difficulty
  const query = searchParams.query
  const tab = searchParams.tab

  const where: Record<string, unknown> = {}

  if (language) where.language = language
  if (query) {
    where.OR = [
      { name: { contains: query } },
      { fullName: { contains: query } },
      { description: { contains: query } },
    ]
  }
  if (difficulty) {
    where.reports = { some: { difficulty } }
  }
  if (tab === "favorites" && session?.user?.id) {
    where.favorites = { some: { userId: session.user.id } }
  }

  const [projects, total, userFavorites] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        reports: {
          select: {
            id: true,
            summary: true,
            difficulty: true,
            generatedAt: true,
          },
          orderBy: { generatedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { stars: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.project.count({ where }),
    session?.user?.id
      ? prisma.favorite.findMany({
          where: { userId: session.user.id },
          select: { projectId: true },
        })
      : Promise.resolve([]),
  ])

  const favoriteSet = new Set(userFavorites.map((f) => f.projectId))
  const totalPages = Math.ceil(total / pageSize)

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">暂无项目</h3>
        <p className="text-muted-foreground mb-4">
          {tab === "favorites"
            ? "你还没有收藏任何项目，去项目列表看看吧"
            : "数据库中没有项目，请先点击下方按钮发现 GitHub 上的热门 AI 项目"}
        </p>
        {tab !== "favorites" && <DiscoverButton />}
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={{
              id: project.id,
              githubId: project.githubId,
              name: project.name,
              fullName: project.fullName,
              description: project.description,
              stars: project.stars,
              forks: project.forks,
              language: project.language,
              topics: JSON.parse(project.topics || "[]"),
              license: project.license,
              homepage: project.homepage,
              lastPushedAt: project.lastPushedAt?.toISOString() ?? null,
              lastAnalyzedAt: project.lastAnalyzedAt?.toISOString() ?? null,
              createdAt: project.createdAt.toISOString(),
              reports: project.reports.map((r) => ({
                id: r.id,
                summary: r.summary,
                difficulty: r.difficulty,
                generatedAt: r.generatedAt.toISOString(),
              })),
            }}
            favorited={favoriteSet.has(project.id)}
            showFavorite={!!session}
          />
        ))}
      </div>
      <PaginationRow
        page={page}
        totalPages={totalPages}
        searchParams={searchParams}
      />
    </>
  )
}

function DiscoverButton() {
  return (
    <form action={discoverProjects}>
      <Button type="submit">
        <RefreshCw className="mr-2 h-4 w-4" />
        发现热门 AI 项目
      </Button>
    </form>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const isFavorites = params.tab === "favorites"

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isFavorites ? "我的收藏" : "AI 项目分析"}
        </h1>
        <RefreshButton />
      </div>

      <SearchFilter />

      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <ProjectList searchParams={params} />
      </Suspense>
    </div>
  )
}
