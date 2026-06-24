import { prisma } from "./db"
import { buildAnalysisPrompt, ANALYSIS_SYSTEM_PROMPT, ANALYSIS_SYSTEM_PROMPT_STRICT } from "./prompt"
import { parseIllustrationsPlan } from "./xiaohei"
import type { IllustrationPlan } from "@/types"

const DEEPSEEK_API = "https://api.deepseek.com/chat/completions"

interface AnalysisResult {
  summary: string
  overview: string
  architecture: string | null
  keyTechs: string[]
  learningValue: string | null
  difficulty: string
  /** DeepSeek 产出的「小黑」配图脚本。空数组 = 未生成/不可用。 */
  illustrationsPlan: IllustrationPlan[]
}

async function callDeepSeek(
  systemPrompt: string,
  userContent: string,
  apiKey: string,
  maxTokens = 8192
): Promise<string> {
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
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    // 防御性规范化：保证 illustrationsPlan 一定存在且合法。
    // 注意：DeepSeek 输出的字段名是 illustrations，这里解析成 illustrationsPlan。
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
    return null
  }
}

/** Parse the topics JSON column defensively; bad data falls back to []. */
function safeParseTopics(topics: string | null | undefined): string[] {
  if (!topics) return []
  try {
    const parsed = JSON.parse(topics)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function analyzeProject(
  projectId: string,
  userId: string,
  apiKey: string | null,
  systemPrompt: string = ANALYSIS_SYSTEM_PROMPT
): Promise<AnalysisResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    throw new Error(`Project not found: ${projectId}`)
  }

  if (!apiKey) {
    const fallback: AnalysisResult = {
      summary:
        project.description?.slice(0, 50) ??
        `${project.name} 是一个 AI 相关开源项目`,
      overview: `## 项目定位\n\n**${project.fullName}** 是一个在 GitHub 上获得了 ${project.stars.toLocaleString()} Stars 的开源项目。\n\n该项目主要使用 ${project.language ?? "多种"} 语言开发。\n\n> 💡 请先在 [设置页](/dashboard/settings) 配置你自己的 DeepSeek API Key，即可获得 AI 深度分析报告。`,
      architecture: null,
      keyTechs: safeParseTopics(project.topics),
      learningValue:
        "在设置页配置 DeepSeek API Key 后，AI 将为每个项目生成深度的学习建议。",
      difficulty: "intermediate",
      illustrationsPlan: [],
    }

    // Maintain the "one report per project per user" invariant — replace any
    // prior report by this user for this project.
    await prisma.report.deleteMany({ where: { projectId: project.id, userId } })
    await prisma.report.create({
      data: {
        projectId: project.id,
        userId,
        summary: fallback.summary,
        overview: fallback.overview,
        architecture: fallback.architecture,
        keyTechs: JSON.stringify(fallback.keyTechs),
        learningValue: fallback.learningValue,
        difficulty: fallback.difficulty,
        illustrationsPlan: JSON.stringify(fallback.illustrationsPlan),
      },
    })

    await prisma.project.update({
      where: { id: project.id },
      data: { lastAnalyzedAt: new Date() },
    })

    return fallback
  }

  // Call DeepSeek
  const prompt = buildAnalysisPrompt(project)
  let text = ""
  try {
    text = await callDeepSeek(systemPrompt, prompt, apiKey, 8192)
  } catch (e) {
    console.error("DeepSeek API call failed:", e)
    const fallback: AnalysisResult = {
      summary:
        project.description?.slice(0, 50) ??
        `${project.name} 是一个 AI 相关项目`,
      overview: `## 项目定位\n\n**${project.fullName}** 获得了 ${project.stars.toLocaleString()} Stars。\n\n${project.description ?? ""}\n\n> ⚠️ AI 深度分析暂时不可用，请检查你的 DeepSeek API Key 是否有效，或稍后重试。`,
      architecture: null,
      keyTechs: safeParseTopics(project.topics),
      learningValue: null,
      difficulty: "intermediate",
      illustrationsPlan: [],
    }
    await saveReport(project.id, userId, fallback, text)
    return fallback
  }

  let analysis = parseJson(text)

  if (!analysis) {
    // Retry
    try {
      const retryText = await callDeepSeek(
        ANALYSIS_SYSTEM_PROMPT_STRICT,
        `请将以下内容转为合法 JSON：\n\n${text.slice(0, 6000)}`,
        apiKey,
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
      keyTechs: safeParseTopics(project.topics),
      learningValue: null,
      difficulty: "intermediate",
      illustrationsPlan: [],
    }
  }

  // Save to database
  await saveReport(project.id, userId, analysis, text)
  return analysis
}

async function saveReport(
  projectId: string,
  userId: string,
  analysis: AnalysisResult,
  rawResponse: string
) {
  // Delete old reports for this project by this user
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
      // 配图脚本随报告一起存；已生成的 illustrations 在重新分析时由 deleteMany 清空
      //（新报告的脚本可能不同，旧图不再匹配，需重新逐张生成）。
      illustrationsPlan: JSON.stringify(analysis.illustrationsPlan ?? []),
      rawResponse,
    },
  })

  await prisma.project.update({
    where: { id: projectId },
    data: { lastAnalyzedAt: new Date() },
  })
}
