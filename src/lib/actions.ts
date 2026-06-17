"use server"

import { revalidatePath } from "next/cache"
import { signIn, signOut, requireUserId } from "./auth"
import { prisma } from "./db"
import { analyzeProject } from "./analyzer"
import { discoverAIProjects, getRepoReadme, projectDataFromRepo } from "./github"
import { encrypt } from "./crypto"
import { getUserApiKey, getEffectiveSystemPrompt, getUserDiscoverKeywords } from "./userSettings"

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
  const systemPrompt = await getEffectiveSystemPrompt(userId)
  await analyzeProject(projectId, userId, apiKey, systemPrompt)
}

export async function discoverProjects() {
  const userId = await requireUserId()
  if (!userId) return

  // 用户可自定义发现关键词；未配置则 discoverAIProjects 用内置默认列表。
  const keywords = await getUserDiscoverKeywords(userId)
  const repos = await discoverAIProjects(keywords, 3)
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

/**
 * Persist the user's custom discovery keywords. Stored as a JSON string array
 * of non-empty, de-duplicated, lowercased GitHub topics (max 20). Pass an
 * empty value to clear and fall back to the built-in defaults.
 */
export async function saveDiscoverKeywords(raw: string): Promise<SaveKeyResult> {
  const userId = await requireUserId()
  if (!userId) return { ok: false, error: "未登录" }

  const keywords = Array.from(
    new Set(
      raw
        .split(/[\n,，;；]+/)
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0)
    )
  ).slice(0, 20)

  await prisma.user.update({
    where: { id: userId },
    data: {
      // 空列表用 null 存储，表示「使用系统默认」。
      discoverKeywords: keywords.length > 0 ? JSON.stringify(keywords) : null,
    },
  })
  revalidatePath("/dashboard/settings")
  return { ok: true }
}

/**
 * Persist the user's custom analysis prompt, appended to the built-in system
 * prompt at analysis time. Pass empty to clear.
 */
export async function saveCustomPrompt(raw: string): Promise<SaveKeyResult> {
  const userId = await requireUserId()
  if (!userId) return { ok: false, error: "未登录" }

  const text = raw.trim().slice(0, 2000)
  await prisma.user.update({
    where: { id: userId },
    data: { customPrompt: text.length > 0 ? text : null },
  })
  revalidatePath("/dashboard/settings")
  return { ok: true }
}
