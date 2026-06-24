import { prisma } from "./db"
import { buildAnalysisPrompt } from "./prompt"
import { parseIllustrationsPlan } from "./xiaohei"

const DEEPSEEK_API = "https://api.deepseek.com/chat/completions"

interface StreamEvent {
  phase: "connecting" | "generating" | "saving" | "done" | "error"
  progress: number
  message: string
  /** 流式输出的部分文本内容 */
  partialText?: string
  result?: {
    summary: string
    overview: string
    architecture: string | null
    keyTechs: string[]
    learningValue: string | null
    difficulty: string
    illustrationsPlan: unknown[]
  }
}

export async function analyzeProjectStream(
  projectId: string,
  userId: string,
  apiKey: string | null,
  systemPrompt: string,
  onProgress: (event: StreamEvent) => void
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    onProgress({ phase: "error", progress: 0, message: "项目不存在" })
    return
  }

  if (!apiKey) {
    onProgress({ phase: "error", progress: 0, message: "未配置 DeepSeek API Key，请先到「设置」页面配置" })
    return
  }

  // Phase 1: Prepare
  onProgress({ phase: "connecting", progress: 5, message: "正在准备分析数据..." })

  const userPrompt = buildAnalysisPrompt(project)

  onProgress({ phase: "connecting", progress: 10, message: "正在连接 DeepSeek..." })

  // Phase 2: Stream from DeepSeek
  let fullText = ""
  let tokenCount = 0
  const estimatedTokens = 4000

  try {
    const apiRes = await fetch(DEEPSEEK_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 8192,
        temperature: 0.7,
        stream: true,
      }),
    })

    if (!apiRes.ok) {
      onProgress({ phase: "error", progress: 0, message: `API 错误: ${apiRes.status}` })
      return
    }

    const reader = apiRes.body?.getReader()
    if (!reader) {
      onProgress({ phase: "error", progress: 0, message: "无法读取响应流" })
      return
    }

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim()
          if (data === "[DONE]") continue
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              fullText += content
              tokenCount++
              const progress = Math.min(90, 15 + Math.round((tokenCount / estimatedTokens) * 75))
              // Send partial text every 10 tokens for smooth streaming display
              if (tokenCount % 10 === 0) {
                onProgress({
                  phase: "generating",
                  progress,
                  message: `正在生成分析报告... (${tokenCount} tokens)`,
                  partialText: fullText,
                })
              }
            }
          } catch {
            // skip parse errors
          }
        }
      }
    }

    onProgress({ phase: "generating", progress: 88, message: "正在解析分析结果..." })
  } catch (e) {
    onProgress({ phase: "error", progress: 0, message: `网络错误: ${String(e)}` })
    return
  }

  // Phase 3: Parse and save
  onProgress({ phase: "saving", progress: 92, message: "正在提取结构化数据..." })

  const analysis = parseAnalysis(fullText, project)

  onProgress({ phase: "saving", progress: 96, message: "正在保存到数据库..." })

  // Delete old reports by this user for this project and save new
  await prisma.report.deleteMany({ where: { projectId, userId } })
  await prisma.report.create({
    data: {
      projectId,
      userId,
      summary: analysis.summary,
      overview: analysis.overview,
      architecture: analysis.architecture,
      keyTechs: JSON.stringify(analysis.keyTechs),
      learningValue: analysis.learningValue,
      difficulty: analysis.difficulty,
      illustrationsPlan: JSON.stringify(analysis.illustrationsPlan ?? []),
      rawResponse: fullText,
    },
  })

  await prisma.project.update({
    where: { id: projectId },
    data: { lastAnalyzedAt: new Date() },
  })

  onProgress({
    phase: "done",
    progress: 100,
    message: "分析完成！",
    result: analysis,
  })
}

function parseAnalysis(
  text: string,
  project: { description: string | null; name: string; stars: number; topics: string }
) {
  let jsonStr = text.trim()
  if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7)
  else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3)
  if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3)
  jsonStr = jsonStr.trim()

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    return {
      summary: String(parsed.summary ?? ""),
      overview: String(parsed.overview ?? ""),
      architecture: parsed.architecture ? String(parsed.architecture) : null,
      keyTechs: Array.isArray(parsed.keyTechs) ? (parsed.keyTechs as string[]) : [],
      learningValue: parsed.learningValue ? String(parsed.learningValue) : null,
      difficulty: parsed.difficulty ? String(parsed.difficulty) : "intermediate",
      illustrationsPlan: parseIllustrationsPlan(parsed.illustrations),
    }
  } catch {
    let topics: string[] = []
    try {
      const parsed = JSON.parse(project.topics)
      topics = Array.isArray(parsed) ? parsed : []
    } catch {
      topics = []
    }
    return {
      summary: project.description?.slice(0, 50) ?? `${project.name} 是一个 AI 相关项目`,
      overview: `## 项目定位\n\n**${project.name}** 获得了 ${project.stars} Stars。`,
      architecture: null,
      keyTechs: topics,
      learningValue: null,
      difficulty: "intermediate",
      illustrationsPlan: [],
    }
  }
}
