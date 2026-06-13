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
