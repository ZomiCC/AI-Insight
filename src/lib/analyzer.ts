import { prisma } from "./db"

const DEEPSEEK_API = "https://api.deepseek.com/chat/completions"

interface AnalysisResult {
  summary: string
  overview: string
  architecture: string | null
  keyTechs: string[]
  learningValue: string | null
  difficulty: string
}

function buildPrompt(project: {
  name: string
  fullName: string
  description: string | null
  stars: number
  language: string | null
  topics: string
  readme: string | null
}): string {
  const readmePreview = project.readme
    ? project.readme.slice(0, 12000)
    : "（无 README 内容）"

  return `你是一位世界级的 AI 技术架构师和技术作家。请对以下 GitHub 开源项目进行深度的、有洞察力的分析。

## 项目基本信息

- **项目名称**：${project.fullName}
- **简介**：${project.description ?? "未提供"}
- **Star 数**：${project.stars}（全球排名极高的开源项目）
- **主要语言**：${project.language ?? "未知"}
- **标签**：${project.topics}

## README

${readmePreview}

---

请进行以下维度的深度分析。输出严格的 JSON 格式（所有字符串字段支持 Markdown）：

{
  "summary": "用一句话精准概括这个项目的本质（不超过50字），要体现其独特价值",
  "overview": "## 项目定位\\n\\n阐述这个项目在 AI 生态中的位置（2-3段）。\\n\\n## 竞品对比\\n\\n与 2-3 个同类项目对比，指出差异化优势。然后附一个竞品关系图（用 mermaid flowchart LR 代码块，节点用中文文字，用双引号包裹含标点的节点文字）。",
  "architecture": "## 整体架构\\n\\n深度分析技术架构（3-5段），必须包含至少 2 个 mermaid 流程图。\\n\\n第1张图（flowchart TD）：架构分层图，节点用中文描述各层组件，清晰展示层级关系\\n第2张图（flowchart LR）：核心数据流图，展示从输入到输出的完整链路\\n\\n语法注意：用双引号包裹含标点符号的节点文字（如 A[\\\"用户输入层\\\"]）。\\n\\n之后继续文字分析：模块组织、设计模式、扩展机制。如果没有足够信息，基于你对类似项目的了解进行合理推断。",
  "keyTechs": ["技术点1", "技术点2", ...]（至少列出 5 个关键技术点，按重要性排序）,
  "learningValue": "## 为什么值得学\\n\\n这个项目在技术上有哪些值得学习的亮点？\\n\\n## 适合人群\\n\\n- 入门/中级/高级分别适合哪些人？\\n- 需要什么前置知识？\\n\\n## 学习路线\\n\\n给出一个 3-4 步的实践学习路径，从「跑起来」到「看懂源码」到「能贡献」。每步给出具体的文件或模块名称。\\n\\n## 职业价值\\n\\n掌握这个项目对哪些方向的职业发展有帮助？",
  "difficulty": "beginner / intermediate / advanced"
}

要求：
- 用中文撰写，专业、有深度、可读性强
- overview、architecture、learningValue 字段中可以使用 Markdown 格式（标题、列表、代码块）
- 必须是合法的 JSON 格式，字符串中的换行用 \\n 表示，双引号用 \\" 转义
- keyTechs 必须至少 5 项`
}

async function callDeepSeek(
  systemPrompt: string,
  userContent: string,
  maxTokens = 8192
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  const res = await fetch(DEEPSEEK_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ""
}

function parseJson(text: string): AnalysisResult | null {
  let jsonStr = text.trim()
  // Remove markdown code fences
  if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7)
  else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3)
  if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3)
  jsonStr = jsonStr.trim()

  try {
    return JSON.parse(jsonStr) as AnalysisResult
  } catch {
    return null
  }
}

export async function analyzeProject(projectId: string): Promise<AnalysisResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    throw new Error(`Project not found: ${projectId}`)
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey || apiKey === "your_deepseek_api_key") {
    const fallback: AnalysisResult = {
      summary:
        project.description?.slice(0, 50) ??
        `${project.name} 是一个 AI 相关开源项目`,
      overview: `## 项目定位\n\n**${project.fullName}** 是一个在 GitHub 上获得了 ${project.stars.toLocaleString()} Stars 的开源项目。\n\n该项目主要使用 ${project.language ?? "多种"} 语言开发。\n\n> 💡 配置 DeepSeek API Key 后可获得 AI 深度分析报告。`,
      architecture: null,
      keyTechs: JSON.parse(project.topics || "[]"),
      learningValue:
        "配置 DeepSeek API Key 后，AI 将为每个项目生成深度的学习建议。",
      difficulty: "intermediate",
    }

    await prisma.report.create({
      data: {
        projectId: project.id,
        summary: fallback.summary,
        overview: fallback.overview,
        architecture: fallback.architecture,
        keyTechs: JSON.stringify(fallback.keyTechs),
        learningValue: fallback.learningValue,
        difficulty: fallback.difficulty,
      },
    })

    await prisma.project.update({
      where: { id: project.id },
      data: { lastAnalyzedAt: new Date() },
    })

    return fallback
  }

  // Call DeepSeek
  const prompt = buildPrompt(project)
  let text = ""
  try {
    text = await callDeepSeek(
      "你是一个世界级的 AI 架构师和技术作家。你擅长对开源项目进行深度剖析，能从代码结构、设计哲学、算法原理等多个维度给出有洞察力的分析。请严格按要求的 JSON 格式输出，所有字符串字段支持 Markdown。",
      prompt,
      8192
    )
  } catch (e) {
    console.error("DeepSeek API call failed:", e)
    const fallback: AnalysisResult = {
      summary:
        project.description?.slice(0, 50) ??
        `${project.name} 是一个 AI 相关项目`,
      overview: `## 项目定位\n\n**${project.fullName}** 获得了 ${project.stars.toLocaleString()} Stars。\n\n${project.description ?? ""}\n\n> ⚠️ AI 深度分析暂时不可用，请稍后重试。`,
      architecture: null,
      keyTechs: JSON.parse(project.topics || "[]"),
      learningValue: null,
      difficulty: "intermediate",
    }
    await saveReport(project.id, fallback, text)
    return fallback
  }

  let analysis = parseJson(text)

  if (!analysis) {
    // Retry
    try {
      const retryText = await callDeepSeek(
        "你必须只输出有效的 JSON 对象。不要任何解释、markdown 标记或额外文本。字符串中的换行用 \\n。",
        `请将以下内容转为合法 JSON：\n\n${text.slice(0, 6000)}`,
        4096
      )
      analysis = parseJson(retryText)
    } catch {
      // ignore
    }
  }

  if (!analysis) {
    analysis = {
      summary:
        project.description?.slice(0, 50) ??
        `${project.name} 是一个 AI 相关项目`,
      overview: `## 项目定位\n\n**${project.fullName}** 获得了 ${project.stars} Stars。\n\n${project.description ?? "暂无描述"}`,
      architecture: null,
      keyTechs: JSON.parse(project.topics || "[]"),
      learningValue: null,
      difficulty: "intermediate",
    }
  }

  // Save to database
  await saveReport(project.id, analysis, text)
  return analysis
}

async function saveReport(
  projectId: string,
  analysis: AnalysisResult,
  rawResponse: string
) {
  // Delete old reports for this project
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
      rawResponse,
    },
  })

  await prisma.project.update({
    where: { id: projectId },
    data: { lastAnalyzedAt: new Date() },
  })
}
