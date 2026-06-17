import type { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { discoverAIProjects, getRepoReadme, projectDataFromRepo } from "@/lib/github"
import { auth } from "@/lib/auth"

/**
 * A cron run is authorized if EITHER:
 *   - it carries the shared CRON_SECRET (Vercel Cron / GitHub Actions), OR
 *   - it is made by a logged-in user (the dashboard "刷新数据" button).
 * With no CRON_SECRET configured, only logged-in users may trigger it.
 *
 * Note: cron only DISCOVERS new projects. AI analysis is not done here because
 * DeepSeek API keys are now per-user (configured on /dashboard/settings) and a
 * cron run has no user context. Users trigger analysis manually on each
 * project page with their own key.
 */
function isAuthorizedBySecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${secret}`) return true
  if (request.nextUrl.searchParams.get("secret") === secret) return true
  return false
}

export async function GET(request: NextRequest) {
  const session = await auth()
  const isUser = !!session?.user?.id
  if (!isUser && !isAuthorizedBySecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results = {
    discovered: 0,
    errors: [] as string[],
  }

  try {
    const repos = await discoverAIProjects(3)

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
        results.discovered++
      }
    }

    return Response.json({
      message: `刷新完成：发现 ${results.discovered} 个新项目（AI 分析请在项目页用你自己的 Key 手动触发）`,
      ...results,
    })
  } catch (error) {
    return Response.json(
      { error: "Refresh failed", details: String(error) },
      { status: 500 }
    )
  }
}
