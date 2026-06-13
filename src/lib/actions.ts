"use server"

import { auth, signIn, signOut } from "./auth"
import { prisma } from "./db"
import { analyzeProject } from "./analyzer"
import { discoverAIProjects, getRepoReadme } from "./github"

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" })
}

export async function signOutUser() {
  await signOut({ redirectTo: "/" })
}

export async function toggleFavorite(projectId: string) {
  const session = await auth()
  if (!session?.user?.id) return

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_projectId: {
        userId: session.user.id,
        projectId,
      },
    },
  })

  if (existing) {
    await prisma.favorite.deleteMany({
      where: { userId: session.user.id, projectId },
    })
  } else {
    await prisma.favorite.create({
      data: { userId: session.user.id, projectId },
    })
  }
}

export async function triggerAnalysis(projectId: string) {
  await analyzeProject(projectId)
}

export async function discoverProjects() {
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
    }
  }
}
