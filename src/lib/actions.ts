"use server"

import { revalidatePath } from "next/cache"
import { signIn, signOut, requireUserId } from "./auth"
import { prisma } from "./db"
import { analyzeProject } from "./analyzer"
import { discoverAIProjects, getRepoReadme, projectDataFromRepo } from "./github"
import { encrypt } from "./crypto"
import { getUserApiKey } from "./userSettings"

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" })
}

export async function signOutUser() {
  await signOut({ redirectTo: "/" })
}

export async function toggleFavorite(projectId: string) {
  const userId = await requireUserId()
  if (!userId) return

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  })

  if (existing) {
    await prisma.favorite.deleteMany({
      where: { userId, projectId },
    })
  } else {
    await prisma.favorite.create({
      data: { userId, projectId },
    })
  }
}

export async function triggerAnalysis(projectId: string) {
  const userId = await requireUserId()
  if (!userId) return
  const apiKey = await getUserApiKey(userId)
  await analyzeProject(projectId, userId, apiKey)
}

export async function discoverProjects() {
  const userId = await requireUserId()
  if (!userId) return

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
    }
  }
}

export type SaveKeyResult = { ok: true } | { ok: false; error: string }

/**
 * Validate, encrypt and store the user's DeepSeek API key. Overwrites any
 * previously configured key so the user can update it at any time.
 */
export async function saveDeepSeekApiKey(rawKey: string): Promise<SaveKeyResult> {
  const userId = await requireUserId()
  if (!userId) return { ok: false, error: "未登录" }

  const key = rawKey.trim()
  if (!key) return { ok: false, error: "API Key 不能为空" }
  if (!key.startsWith("sk-")) {
    return { ok: false, error: "DeepSeek API Key 通常以 sk- 开头，请检查后重试" }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deepseekApiKey: encrypt(key) },
  })
  revalidatePath("/dashboard/settings")
  return { ok: true }
}

/**
 * Remove the user's DeepSeek API key entirely.
 */
export async function deleteDeepSeekApiKey(): Promise<void> {
  const userId = await requireUserId()
  if (!userId) return
  await prisma.user.update({
    where: { id: userId },
    data: { deepseekApiKey: null },
  })
  revalidatePath("/dashboard/settings")
}
