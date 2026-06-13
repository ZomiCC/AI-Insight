import { prisma } from "@/lib/db"
import { discoverAIProjects, getRepoReadme } from "@/lib/github"
import { analyzeProject } from "@/lib/analyzer"

export async function GET() {
  const results = {
    discovered: 0,
    analyzed: 0,
    errors: [] as string[],
  }

  try {
    // Step 1: Discover new projects
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
          data: {
            githubId: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language,
            topics: JSON.stringify(repo.topics || []),
            license: repo.license?.spdx_id ?? null,
            homepage: repo.homepage,
            readme,
            defaultBranch: repo.default_branch,
            lastPushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
          },
        })
        results.discovered++
      }
    }

    // Step 2: Analyze projects without reports
    const unanalyzed = await prisma.project.findMany({
      where: {
        reports: { none: {} },
        readme: { not: null },
      },
      take: 5,
    })

    for (const project of unanalyzed) {
      try {
        await analyzeProject(project.id)
        results.analyzed++
        // Rate limit protection
        await new Promise((r) => setTimeout(r, 2000))
      } catch (e) {
        results.errors.push(`${project.fullName}: ${String(e)}`)
      }
    }

    return Response.json({
      message: `刷新完成：发现 ${results.discovered} 个新项目，分析 ${results.analyzed} 个项目`,
      ...results,
    })
  } catch (error) {
    return Response.json(
      { error: "Refresh failed", details: String(error) },
      { status: 500 }
    )
  }
}
