import { prisma } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          fullName: true,
          stars: true,
          language: true,
        },
      },
    },
  })

  if (!report) {
    return Response.json({ error: "Report not found" }, { status: 404 })
  }

  return Response.json({
    id: report.id,
    projectId: report.projectId,
    project: report.project,
    summary: report.summary,
    overview: report.overview,
    architecture: report.architecture,
    keyTechs: JSON.parse(report.keyTechs || "[]"),
    learningValue: report.learningValue,
    difficulty: report.difficulty,
    generatedAt: report.generatedAt.toISOString(),
  })
}
