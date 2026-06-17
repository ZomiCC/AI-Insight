import crypto from "node:crypto"

/**
 * Symmetric encryption for sensitive per-user secrets (e.g. the DeepSeek API
 * key users configure on the settings page). Uses AES-256-GCM, which gives
 * both confidentiality and integrity (auth tag detects tampering).
 *
 * The key is derived from the ENCRYPTION_KEY env var (falling back to
 * AUTH_SECRET so a single secret can bootstrap a small deployment). Rotating
 * the secret invalidates all stored ciphertext — generate a stable one:
 *   openssl rand -hex 32
 */

const IV_LENGTH = 12 // 96-bit IV is recommended for GCM
const TAG_LENGTH = 16

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY ?? process.env.AUTH_SECRET
  if (!secret) {
    throw new Error(
      "ENCRYPTION_KEY (or AUTH_SECRET) must be set to store user API keys"
    )
  }
  return crypto.createHash("sha256").update(secret).digest()
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [iv, tag, ciphertext].map((b) => b.toString("base64")).join(":")
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":")
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid ciphertext payload")
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivB64, "base64")
  )
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8")
}

void TAG_LENGTH
