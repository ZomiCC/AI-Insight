/**
 * 一次性探针:确认 Agnes 图像 API 的正确端点 + 返回格式。
 * 从 gitignored 的 .env.agnes-probe 读取 key,绝不内联 key。
 * 运行: node scripts/probe-agnes.mjs   (验证后删除本文件与 .env.agnes-probe)
 *
 * 现状:api.agnes-ai.com/v1/images/generations 返回 404 route not found(但 key 有效)。
 * 这里并行探测多个候选 base + 路径,锁定能用的那个。
 */
import { readFileSync } from "node:fs"

function loadKey() {
  const env = readFileSync(".env.agnes-probe", "utf8")
  const m = env.match(/AGNES_API_KEY=(.+)/)
  if (!m) throw new Error("AGNES_API_KEY not found in .env.agnes-probe")
  return m[1].trim()
}

const key = loadKey()

const prompt =
  "Generate one standalone 16:9 horizontal Chinese article illustration. " +
  "Pure white background. Minimalist black hand-drawn line art. Lots of white space. " +
  "A small solid-black absurd creature with white dot eyes performing a core action. " +
  "Sparse red/orange/blue handwritten Chinese annotations only: 输入 处理 输出."

const bases = [
  "https://api.agnes-ai.com/v1",
  "https://apihub.agnes-ai.com/v1",
]
const paths = ["/images/generations", "/image/generations"]

for (const base of bases) {
  for (const path of paths) {
    const url = base + path
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "agnes-image-2.1-flash",
          prompt,
          size: "1K",
          ratio: "16:9",
        }),
      })
      const text = await res.text()
      let detail = text.slice(0, 180)
      try {
        const j = JSON.parse(text)
        detail = JSON.stringify(j).slice(0, 180)
      } catch {}
      console.log(`${res.status}  ${url}`)
      console.log(`        ${detail}\n`)

      // 锁定 apihub 后，追加验证：下载返回的 url 转 base64（正是 agnes.ts 要做的）。
      if (res.ok && url.includes("apihub") && path === "/images/generations") {
        try {
          const j = JSON.parse(text)
          const imgUrl = j?.data?.[0]?.url
          if (imgUrl) {
            const imgRes = await fetch(imgUrl)
            const buf = Buffer.from(await imgRes.arrayBuffer())
            console.log(`        ↓ download ${imgUrl.slice(0, 60)}...`)
            console.log(`          status=${imgRes.status} bytes=${buf.length} base64len=${buf.toString("base64").length}\n`)
          }
        } catch (e) {
          console.log(`        download check failed: ${String(e).slice(0, 120)}\n`)
        }
      }
    } catch (e) {
      console.log(`ERR  ${url}\n        ${String(e).slice(0, 120)}\n`)
    }
  }
}

console.log("✅ probe done")

