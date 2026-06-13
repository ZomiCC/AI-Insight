import { prisma } from "./db"

const DEEPSEEK_API = "https://api.deepseek.com/chat/completions"

interface StreamEvent {
  phase: "connecting" | "generating" | "saving" | "done" | "error"
  progress: number
  message: string
  result?: {
    summary: string
    overview: string
    architecture: string | null
    keyTechs: string[]
    learningValue: string | null
    difficulty: string
  }
}

export async function analyzeProjectStream(
  projectId: string,
  onProgress: (event: StreamEvent) => void
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    onProgress({ phase: "error", progress: 0, message: "项目不存在" })
    return
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey || apiKey === "your_deepseek_api_key") {
    onProgress({ phase: "error", progress: 0, message: "DeepSeek API Key 未配置" })
    return
  }

  // Phase 1: Prepare
  onProgress({ phase: "connecting", progress: 5, message: "正在准备分析数据..." })

  const readmePreview = project.readme
    ? project.readme.slice(0, 12000)
    : "（无 README 内容）"

  const userPrompt = `你是一位世界级的 AI 技术架构师和技术作家。请对以下 GitHub 开源项目进行深度的、有洞察力的分析。

## 项目基本信息

- **项目名称**：${project.fullName}
- **简介**：${project.description ?? "未提供"}
- **Star 数**：${project.stars}
- **主要语言**：${project.language ?? "未知"}
- **标签**：${project.topics}

## README

${readmePreview}

---

请进行以下维度的深度分析。输出严格的 JSON 格式：

{
  "summary": "用一句话精准概括这个项目的本质（不超过50字）",
  "overview": "## 项目定位\\n\\n阐述项目在 AI 生态中的位置（2-3段）。\\n\\n## 竞品对比\\n\\n与 2-3 个同类项目对比，指出差异化优势。",
  "architecture": "## 整体架构\\n\\n深度分析技术架构：分层设计、核心数据流、模块组织、设计模式、扩展机制（3-5段）。如果没有足够信息，基于对类似项目的了解进行合理推断。",
  "keyTechs": ["技术点1", "技术点2", ...]（至少列出 5 个）,
  "learningValue": "## 为什么值得学\\n\\n## 适合人群\\n\\n## 学习路线\\n\\n3-4 步实践路径\\n\\n## 职业价值",
  "difficulty": "beginner / intermediate / advanced"
}

要求：中文，专业有深度。必须是合法 JSON，字符串中换行用 \\n，双引号用 \\"。keyTechs 至少 5 项。`

  const systemPrompt =
    "你是一个世界级的 AI 架构师和技术作家。请严格按要求的 JSON 格式输出。"

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
      const body = await apiRes.text()
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
              if (tokenCount % 50 === 0) {
                onProgress({
                  phase: "generating",
                  progress,
                  message: `正在生成分析报告... (${tokenCount} tokens)`,
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

  // Delete old reports and save new
  await prisma.report.deleteMany({ where: { projectId } })
  await prisma.report.create({
    data: {
      projectId,
      summary: analysis.summary,
      overview: analysis.overview,
      architecture: analysis.architecture,
      keyTechs: JSON.stringify(analysis.keyTechs),
      learningValue: analysis.learningValue,
      difficulty: analysis.difficulty,
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
    return JSON.parse(jsonStr)
  } catch {
    return {
      summary: project.description?.slice(0, 50) ?? `${project.name} 是一个 AI 相关项目`,
      overview: `## 项目定位\n\n**${project.name}** 获得了 ${project.stars} Stars。`,
      architecture: null,
      keyTechs: JSON.parse(project.topics || "[]"),
      learningValue: null,
      difficulty: "intermediate",
    }
  }
}
