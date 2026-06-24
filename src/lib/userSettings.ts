import { prisma } from "./db"
import { decrypt } from "./crypto"
import { ANALYSIS_SYSTEM_PROMPT } from "./prompt"

/**
 * Per-user DeepSeek API key access. The key is stored encrypted in the User
 * table (see lib/crypto.ts) and only decrypted here, server-side, right before
 * being passed to the analyzer.
 */

/** Returns the decrypted DeepSeek API key for a user, or null if not configured. */
export async function getUserApiKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { deepseekApiKey: true },
  })
  if (!user?.deepseekApiKey) return null
  try {
    return decrypt(user.deepseekApiKey)
  } catch (e) {
    console.error("Failed to decrypt DeepSeek API key:", e)
    return null
  }
}

/**
 * Returns a masked preview of the key (e.g. "sk-••••••••1234") for display on
 * the settings page, or null if no key is configured. Never returns the full
 * key — safe to pass to a client component.
 */
export async function getUserApiKeyMasked(
  userId: string
): Promise<string | null> {
  const key = await getUserApiKey(userId)
  if (!key) return null
  return maskApiKey(key)
}

export function maskApiKey(key: string): string {
  const trimmed = key.trim()
  if (trimmed.length <= 4) return "••••••••"
  const last4 = trimmed.slice(-4)
  const head = trimmed.length > 8 ? trimmed.slice(0, trimmed.indexOf("-") + 1) : ""
  return `${head}${"•".repeat(8)}${last4}`
}

/**
 * Returns the decrypted Agnes (image) API key for a user, or null if not
 * configured. Mirrors getUserApiKey — same encryption, same server-only decrypt.
 */
export async function getUserAgnesKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { agnesApiKey: true },
  })
  if (!user?.agnesApiKey) return null
  try {
    return decrypt(user.agnesApiKey)
  } catch (e) {
    console.error("Failed to decrypt Agnes API key:", e)
    return null
  }
}

/**
 * Masked preview of the Agnes key for the settings page, or null. Mirrors
 * getUserApiKeyMasked — never returns the full key.
 */
export async function getUserAgnesKeyMasked(
  userId: string
): Promise<string | null> {
  const key = await getUserAgnesKey(userId)
  if (!key) return null
  return maskApiKey(key)
}

/**
 * Returns the user's custom analysis prompt, or null if none configured.
 * This is appended to the built-in system prompt at analysis time so users
 * can steer the AI's focus (e.g. "重点分析 RAG 相关实现").
 */
export async function getUserCustomPrompt(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { customPrompt: true },
  })
  const text = user?.customPrompt?.trim()
  return text ? text : null
}

/**
 * Returns the effective system prompt for a user: the built-in
 * {@link ANALYSIS_SYSTEM_PROMPT} plus their custom prompt (if any) appended
 * after a blank-line separator.
 */
export async function getEffectiveSystemPrompt(
  userId: string
): Promise<string> {
  const custom = await getUserCustomPrompt(userId)
  return custom ? `${ANALYSIS_SYSTEM_PROMPT}\n\n${custom}` : ANALYSIS_SYSTEM_PROMPT
}

/**
 * Returns the user's custom discovery keywords (GitHub topics), or null if
 * none configured. Discovery falls back to the built-in DEFAULT_AI_TOPICS
 * when this is null/empty.
 */
export async function getUserDiscoverKeywords(
  userId: string
): Promise<string[] | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { discoverKeywords: true },
  })
  if (!user?.discoverKeywords) return null
  try {
    const parsed = JSON.parse(user.discoverKeywords)
    if (!Array.isArray(parsed)) return null
    const cleaned = parsed
      .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
      .map((k) => k.trim())
    return cleaned.length > 0 ? cleaned : null
  } catch {
    return null
  }
}
