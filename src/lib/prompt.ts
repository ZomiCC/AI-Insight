/**
 * Shared DeepSeek prompt for project analysis.
 *
 * Both the standard analyzer (`analyzer.ts`) and the streaming analyzer
 * (`analyzer-stream.ts`) use this so the report schema stays identical
 * regardless of which code path generates it.
 */

interface PromptProject {
  name: string
  fullName: string
  description: string | null
  stars: number
  language: string | null
  topics: string
  readme: string | null
}

export function buildAnalysisPrompt(project: PromptProject): string {
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
  "overview": "## 项目定位\\n\\n阐述这个项目在 AI 生态中的位置（2-3段）。\\n\\n## 竞品对比\\n\\n与 2-3 个同类项目逐一对比，每项列出：核心功能差异、性能优劣、社区活跃度、适用场景。最后用列表总结本项目的差异化优势。",
  "architecture": "## 架构分层\\n\\n用以下格式详细描述系统的分层架构，每层说明其职责和核心作用：\\n\\n**第1层：名称**\\n- 职责：这一层负责什么\\n- 核心作用：在整体架构中的关键价值\\n\\n**第2层：名称**\\n...\\n\\n## 核心数据流\\n\\n用以下格式详细描述数据在系统中的流转过程，每一步说明输入、处理、输出和核心作用：\\n\\n**步骤1：名称**\\n用户请求 → 经过什么处理 → 输出什么\\n- 核心作用：为什么这一步必不可少\\n\\n**步骤2：名称**\\n上一步的输出 → 经过什么处理 → 传递给下一步\\n- 核心作用：...\\n\\n（继续3-6步，覆盖完整链路）\\n\\n## 模块组织\\n\\n描述代码仓库的目录结构和模块划分逻辑。\\n\\n## 设计模式\\n\\n分析采用的关键设计模式及其应用场景。\\n\\n## 扩展机制\\n\\n描述项目的插件/扩展体系。\\n\\n如果没有足够信息，基于你对类似项目的了解进行合理推断。",
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

export const ANALYSIS_SYSTEM_PROMPT =
  "你是一个世界级的 AI 架构师和技术作家。你擅长对开源项目进行深度剖析，能从代码结构、设计哲学、算法原理等多个维度给出有洞察力的分析。请严格按要求的 JSON 格式输出，所有字符串字段支持 Markdown。"

export const ANALYSIS_SYSTEM_PROMPT_STRICT =
  "你必须只输出有效的 JSON 对象。不要任何解释、markdown 标记或额外文本。字符串中的换行用 \\n。"
