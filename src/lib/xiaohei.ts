/**
 * 「小黑」配图的生图提示词构建。
 *
 * 方法论来自 ian-xiaohei-illustrations skill（MIT）的 references/prompt-template.md。
 * 这里把那份英文模板内联成常量，再把 DeepSeek 产出的 shot list（IllustrationPlan）
 * 填进去，得到一个直接喂给 Agnes 图像模型的 prompt。
 *
 * 设计目标（与 skill 的 QA checklist 一致）：纯白底、黑色手绘线稿、大量留白、
 * 少量红橙蓝中文标注；小黑必须承担核心动作，不是装饰；一张图只讲一个结构。
 *
 * 注意：DeepSeek 是纯文本模型，画不了图。真正的出图由 lib/agnes.ts 调 Agnes 完成；
 * 本文件只负责把「中文认知锚点」翻译成高质量的「英文生图指令」。
 */

import type { IllustrationPlan } from "@/types"

/** 单次分析最多生成几张配图。受 Vercel Hobby 60s 超时约束（每张 ~10s）。 */
export const MAX_ILLUSTRATIONS = 4

/**
 * 固定的视觉 DNA + IP 规则。每张图共用，只替换 theme/structure/coreIdea/composition/labels。
 * 直接取自 skill 的 prompt-template.md，保持与「小黑」风格校准样例一致。
 */
const VISUAL_DNA = `Pure white background. Minimalist black hand-drawn line art. Slightly wobbly pen lines. Lots of empty white space. Sparse red/orange/blue handwritten Chinese annotations. Clean absurd product-sketch feeling. No gradients, no shadows, no paper texture, no complex background, no commercial vector style, no PPT infographic look, no cute mascot poster, no children's illustration, no realistic UI.`

const XIAOHEI_IP = `小黑, a small solid-black absurd creature with white dot eyes, tiny thin legs, blank serious expression, slightly uneven hand-drawn body shape. 小黑 must perform the core conceptual action, not decorate the scene. Make 小黑 serious, deadpan, and slightly bizarre, not cute.`

const COLOR_RULES = `Black for main line art and 小黑. Orange for main flow/path/arrows. Red only for key warnings/problems/results. Blue only for secondary notes or feedback/system state.`

const CONSTRAINTS = `One image explains only one core structure. Keep the main subject around 40%-60% of the canvas. Preserve at least 35% blank white space. Use at most 5-8 short handwritten Chinese labels. Do not write a title in the top-left corner. Do not write the structure type on the image. Do not make it a formal diagram, course slide, or dense explainer. Invent a fresh visual metaphor for this specific project. It should be clear but not instructional, interesting but not childish, strange but clean.`

/**
 * 把单条配图脚本翻译成 Agnes 的英文生图 prompt。
 * 标注词越少越稳定（skill 经验：中文文字越短越不出错），所以限制最多取前 5 个。
 */
export function buildImagePrompt(plan: IllustrationPlan): string {
  const labels = (plan.labels ?? []).filter((l) => l.trim()).slice(0, 5)
  const labelsText = labels.length > 0 ? labels.join(" / ") : "(none)"

  return [
    "Generate one standalone 16:9 horizontal Chinese article illustration.",
    "Visual DNA:",
    VISUAL_DNA,
    "Recurring IP character required:",
    XIAOHEI_IP,
    "Theme:",
    plan.topic,
    "Structure type:",
    plan.structure,
    "Core idea:",
    plan.coreIdea,
    "Composition:",
    plan.xiaohei,
    "Chinese handwritten labels:",
    labelsText,
    "Color use:",
    COLOR_RULES,
    "Constraints:",
    CONSTRAINTS,
  ].join("\n")
}

/**
 * 防御性解析 DeepSeek 产出的 illustrations 字段。坏数据回退为空数组，
 * 保证哪怕 DeepSeek 漏了字段或格式错，也不会让整个分析报告挂掉。
 */
export function parseIllustrationsPlan(raw: unknown): IllustrationPlan[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      anchor: String(item.anchor ?? "").trim(),
      topic: String(item.topic ?? "").trim(),
      coreIdea: String(item.coreIdea ?? "").trim(),
      structure: String(item.structure ?? "概念隐喻").trim(),
      xiaohei: String(item.xiaohei ?? "").trim(),
      labels: Array.isArray(item.labels)
        ? item.labels.filter((l): l is string => typeof l === "string").map((l) => l.trim())
        : [],
    }))
    .filter((p) => p.topic && p.xiaohei) // 没主题/没动作的项无法生图，丢弃
    .slice(0, MAX_ILLUSTRATIONS)
}
