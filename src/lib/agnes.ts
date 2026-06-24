/**
 * Agnes 图像生成 API 射装（OpenAI 兼容）。
 *
 * 端点：https://apihub.agnes-ai.com/v1/images/generations   ← 注意是 apihub 子域名
 *   （api.agnes-ai.com 会返回 404 route not found；实测确认 apihub 才是正解）
 * 模型：agnes-image-2.1-flash（文本生成图片，免费不限量，ratio 支持 16:9 正好匹配小黑横版）
 * 认证：Authorization: Bearer <AGNES_API_KEY>（与 DeepSeek 一样，每用户自配、加密存库）
 * 返回：data[0].url（PNG，已实测），b64_json 为 null → 故下载 url 再转 base64。
 *
 * 调用方传明文 key（由 userSettings.getUserAgnesKey 在服务端解密后传入）。
 * 返回值统一为「纯 base64」：报告自包含、图片永不过期，存库后前端直接 data URL 渲染。
 */

const AGNES_IMAGE_API = "https://apihub.agnes-ai.com/v1/images/generations"
const AGNES_IMAGE_MODEL = "agnes-image-2.1-flash"

/** 16:9 横版、1K 分辨率，正好是「小黑」正文配图的比例和清晰度。 */
const AGNES_SIZE = "1K"
const AGNES_RATIO = "16:9"

interface AgnesImageResult {
  base64: string
}

interface AgnesError extends Error {
  status?: number
}

/**
 * 调 Agnes 生成一张小黑配图。
 * @param prompt  由 buildImagePrompt 生成的英文生图指令
 * @param apiKey  用户解密后的 Agnes API key（明文）
 * @throws AgnesError  API 不可用 / key 失效 / 限流等
 */
export async function generateXiaoheiImage(
  prompt: string,
  apiKey: string
): Promise<AgnesImageResult> {
  const res = await fetch(AGNES_IMAGE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AGNES_IMAGE_MODEL,
      prompt,
      size: AGNES_SIZE,
      ratio: AGNES_RATIO,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    const err: AgnesError = new Error(`Agnes API error ${res.status}: ${body.slice(0, 500)}`)
    err.status = res.status
    throw err
  }

  const data = await res.json()
  const item = data?.data?.[0]
  if (!item) {
    throw new Error(`Agnes response has no data[0]: ${JSON.stringify(data).slice(0, 500)}`)
  }

  // 优先直接返回 base64；否则下载 url 再转 base64。
  if (typeof item.b64_json === "string" && item.b64_json.length > 0) {
    return { base64: item.b64_json }
  }

  if (typeof item.url === "string" && item.url.length > 0) {
    return { base64: await downloadAsBase64(item.url) }
  }

  throw new Error(
    `Agnes response item has neither b64_json nor url: ${JSON.stringify(item).slice(0, 500)}`
  )
}

/** 下载图片二进制并转成纯 base64 字符串（无 data: 前缀）。 */
async function downloadAsBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to download generated image (${res.status})`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  return buf.toString("base64")
}
