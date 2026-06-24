export interface ProjectListItem {
  id: string;
  githubId: number;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  license: string | null;
  homepage: string | null;
  lastPushedAt: string | null;
  lastAnalyzedAt: string | null;
  createdAt: string;
  reports: {
    id: string;
    summary: string;
    difficulty: string;
    generatedAt: string;
  }[];
}

export interface ProjectDetail extends ProjectListItem {
  readme: string | null;
  defaultBranch: string;
  updatedAt: string;
  reports: ReportDetail[];
}

export interface ReportDetail {
  id: string;
  summary: string;
  overview: string;
  architecture: string | null;
  keyTechs: string[];
  learningValue: string | null;
  difficulty: string;
  generatedAt: string;
  /** DeepSeek 产出的「小黑」配图脚本（shot list）。null/空 = 老报告或未启用。 */
  illustrationsPlan?: IllustrationPlan[];
  /** 已生成的配图，按 index 对应 illustrationsPlan。base64 为纯 base64（无 data: 前缀）。 */
  illustrations?: IllustrationItem[];
}

/**
 * 单张配图的脚本：DeepSeek 从报告内容里提炼出的一个「认知锚点」。
 * 喂给 buildImagePrompt 后变成 Agnes 的英文生图 prompt。
 */
export interface IllustrationPlan {
  /** 这张图配在报告的哪个部分（如「架构分层」「核心数据流」）。 */
  anchor: string;
  /** 画面主题（如「一鱼多吃」）。 */
  topic: string;
  /** 这张图要表达的核心意思。 */
  coreIdea: string;
  /** 结构类型：Workflow / 系统局部 / 前后对比 / 角色状态 / 概念隐喻 / 方法分层 / 地图路线 / 小漫画分镜。 */
  structure: string;
  /** 小黑在画面里做什么、画面构图（低科技、怪诞但成立的物理隐喻）。 */
  xiaohei: string;
  /** 3-5 个中文手写标注词。 */
  labels: string[];
}

/** 已生成的单张配图。按 index 对应 illustrationsPlan。 */
export interface IllustrationItem {
  /** 对应 illustrationsPlan 的下标。 */
  index: number;
  /** 主题，用于 alt 文本。 */
  topic: string;
  /** 纯 base64（无 data: 前缀），渲染时拼接成 data URL。 */
  base64: string;
}

export interface SearchFilters {
  language?: string;
  difficulty?: string;
  query?: string;
  minStars?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  license: { spdx_id: string } | null;
  homepage: string | null;
  default_branch: string;
  pushed_at: string;
  html_url: string;
}

export interface GitHubSearchResponse {
  total_count: number;
  items: GitHubRepo[];
}
