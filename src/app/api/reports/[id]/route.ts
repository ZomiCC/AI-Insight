import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await requireUserId()

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

  // 报告按用户独立：不是本人或历史无主报告，一律视为不存在。
  if (!report || (report.userId && report.userId !== userId)) {
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
