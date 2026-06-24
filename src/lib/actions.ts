"use server"

import { revalidatePath } from "next/cache"
import { signIn, signOut, requireUserId } from "./auth"
import { prisma } from "./db"
import { analyzeProject } from "./analyzer"
import { discoverAIProjects, getRepoReadme, projectDataFromRepo } from "./github"
import { encrypt } from "./crypto"
import { getUserApiKey, getEffectiveSystemPrompt, getUserDiscoverKeywords, getUserAgnesKey } from "./userSettings"
import { generateXiaoheiImage } from "./agnes"
import { buildImagePrompt } from "./xiaohei"
import type { IllustrationItem } from "@/types"

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

/**
 * Validate, encrypt and store the user's Agnes (image) API key. Same flow as
 * saveDeepSeekApiKey — overwrites any prior key so it can be updated anytime.
 */
export async function saveAgnesApiKey(rawKey: string): Promise<SaveKeyResult> {
  const userId = await requireUserId()
  if (!userId) return { ok: false, error: "未登录" }

  const key = rawKey.trim()
  if (!key) return { ok: false, error: "API Key 不能为空" }
  if (!key.startsWith("sk-")) {
    return { ok: false, error: "Agnes API Key 通常以 sk- 开头，请检查后重试" }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { agnesApiKey: encrypt(key) },
  })
  revalidatePath("/dashboard/settings")
  return { ok: true }
}

/**
 * Remove the user's Agnes API key entirely.
 */
export async function deleteAgnesApiKey(): Promise<void> {
  const userId = await requireUserId()
  if (!userId) return
  await prisma.user.update({
    where: { id: userId },
    data: { agnesApiKey: null },
  })
  revalidatePath("/dashboard/settings")
}

/** 单张配图生成的返回。base64 为纯 base64（无 data: 前缀）。 */
export type GenerateIllustrationResult =
  | { ok: true; base64: string }
  | { ok: false; error: string }

/**
 * 为某条报告的某张配图调用 Agnes 生成 PNG，并按 index 合并存入 report.illustrations。
 * 前端逐张调用（每张一个 HTTP 请求），规避 Vercel 60s 超时；单张失败可重试。
 *
 * 合并策略：读取现有 illustrations（JSON），替换/插入对应 index，整体写回。
 * 并发同一 index 时以最后一次为准，幂等。
 */
export async function generateIllustration(
  reportId: string,
  index: number
): Promise<GenerateIllustrationResult> {
  const userId = await requireUserId()
  if (!userId) return { ok: false, error: "未登录" }

  const report = await prisma.report.findUnique({ where: { id: reportId } })
  // 报告按用户独立：不是本人的报告一律拒绝。
  if (!report || !report.userId || report.userId !== userId) {
    return { ok: false, error: "报告不存在" }
  }

  const plan = (() => {
    try {
      const arr = JSON.parse(report.illustrationsPlan ?? "[]")
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  })()
  if (index < 0 || index >= plan.length) {
    return { ok: false, error: "配图序号无效" }
  }

  const agnesKey = await getUserAgnesKey(userId)
  if (!agnesKey) {
    return { ok: false, error: "请先在「设置」页配置 Agnes API Key" }
  }

  let base64: string
  try {
    const prompt = buildImagePrompt(plan[index])
    const result = await generateXiaoheiImage(prompt, agnesKey)
    base64 = result.base64
  } catch (e) {
    console.error("Agnes image generation failed:", e)
    const status = (e as { status?: number }).status
    const hint =
      status === 401
        ? "Agnes API Key 无效或已过期"
        : status === 429
          ? "调用过于频繁，请稍后重试"
          : "图像生成失败，请稍后重试"
    return { ok: false, error: hint }
  }

  // 合并写入对应 index。读-改-写：同一 index 并发以最后一次为准。
  const existing: IllustrationItem[] = (() => {
    try {
      const arr = JSON.parse(report.illustrations ?? "[]")
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  })()
  const next = existing.filter((it) => it.index !== index)
  next.push({ index, topic: plan[index].topic ?? "", base64 })

  await prisma.report.update({
    where: { id: reportId },
    data: { illustrations: JSON.stringify(next) },
  })

  return { ok: true, base64 }
}
