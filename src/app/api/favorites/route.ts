import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      project: {
        include: {
          reports: {
            where: { userId: session.user.id },
            select: { id: true, summary: true, difficulty: true, generatedAt: true },
            orderBy: { generatedAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return Response.json(
    favorites.map((f) => ({
      id: f.id,
      projectId: f.projectId,
      createdAt: f.createdAt.toISOString(),
      project: {
        id: f.project.id,
        name: f.project.name,
        fullName: f.project.fullName,
        description: f.project.description,
        stars: f.project.stars,
        forks: f.project.forks,
        language: f.project.language,
        topics: JSON.parse(f.project.topics || "[]"),
        lastAnalyzedAt: f.project.lastAnalyzedAt?.toISOString() ?? null,
        reports: f.project.reports.map((r) => ({
          id: r.id,
          summary: r.summary,
          difficulty: r.difficulty,
          generatedAt: r.generatedAt.toISOString(),
        })),
      },
    }))
  )
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await request.json()

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_projectId: {
        userId: session.user.id,
        projectId,
      },
    },
  })

  if (existing) {
    return Response.json({ favorited: true })
  }

  await prisma.favorite.create({
    data: {
      userId: session.user.id,
      projectId,
    },
  })

  return Response.json({ favorited: true })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await request.json()

  await prisma.favorite.deleteMany({
    where: {
      userId: session.user.id,
      projectId,
    },
  })

  return Response.json({ favorited: false })
}
