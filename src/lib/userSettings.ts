import { prisma } from "./db"
import { decrypt } from "./crypto"

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
