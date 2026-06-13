import { prisma } from "@/lib/db"
import type { ProjectDetail } from "@/types"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      reports: {
        orderBy: { generatedAt: "desc" },
      },
    },
  })

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const detail: ProjectDetail = {
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
    readme: project.readme,
    defaultBranch: project.defaultBranch,
    lastPushedAt: project.lastPushedAt?.toISOString() ?? null,
    lastAnalyzedAt: project.lastAnalyzedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    reports: project.reports.map((r) => ({
      id: r.id,
      summary: r.summary,
      overview: r.overview,
      architecture: r.architecture,
      keyTechs: JSON.parse(r.keyTechs || "[]"),
      learningValue: r.learningValue,
      difficulty: r.difficulty,
      generatedAt: r.generatedAt.toISOString(),
    })),
  }

  return Response.json(detail)
}
