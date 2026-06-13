import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { ReportView } from "@/components/ReportView"
import { FavoriteButton, AnalyzeButton } from "@/components/ActionButtons"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Star,
  GitFork,
  ExternalLink,
  ArrowLeft,
  Heart,
  Sparkles,
  Calendar,
} from "lucide-react"
import { formatNumber, formatDate } from "@/lib/utils"
import type { ReportDetail } from "@/types"

async function ProjectDetail({ id }: { id: string }) {
  const session = await auth()

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      reports: {
        orderBy: { generatedAt: "desc" },
      },
    },
  })

  if (!project) {
    notFound()
  }

  const [favorite] = session?.user?.id
    ? await prisma.favorite.findMany({
        where: {
          userId: session.user.id,
          projectId: id,
        },
        take: 1,
      })
    : []

  const isFav = !!favorite
  const topics = JSON.parse(project.topics || "[]") as string[]
  const reports: ReportDetail[] = project.reports.map((r) => ({
    id: r.id,
    summary: r.summary,
    overview: r.overview,
    architecture: r.architecture,
    keyTechs: JSON.parse(r.keyTechs || "[]"),
    learningValue: r.learningValue,
    difficulty: r.difficulty,
    generatedAt: r.generatedAt.toISOString(),
  }))

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "ghost" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回项目列表
      </Link>

      {/* Project header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{project.fullName}</h1>
            <p className="mt-2 text-muted-foreground">
              {project.description ?? "暂无描述"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <FavoriteButton
              projectId={id}
              favorited={isFav}
              enabled={!!session}
            />
            <a
              href={`https://github.com/${project.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="mr-1 h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            {formatNumber(project.stars)} Stars
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="h-4 w-4" />
            {formatNumber(project.forks)} Forks
          </span>
          {project.language && (
            <Badge variant="secondary">{project.language}</Badge>
          )}
          {project.license && (
            <Badge variant="outline">{project.license}</Badge>
          )}
          {project.lastPushedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              最近更新: {formatDate(project.lastPushedAt)}
            </span>
          )}
        </div>

        {topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {topics.map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* AI Analysis Reports */}
      {reports.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 分析报告
          </h2>
          {reports.map((report) => (
            <ReportView
              key={report.id}
              report={report}
              projectName={project.fullName}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无分析报告</h3>
            <p className="text-muted-foreground mb-4">
              点击下方按钮让 AI 分析这个项目
            </p>
            <AnalyzeButton projectId={id} />
          </CardContent>
        </Card>
      )}

    </div>
  )
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      }
    >
      <ProjectDetail id={id} />
    </Suspense>
  )
}
