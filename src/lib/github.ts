import type { GitHubRepo, GitHubSearchResponse } from "@/types"

const GITHUB_API = "https://api.github.com"

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "github-ai-insight",
  }
  const token = process.env.GITHUB_TOKEN
  if (token && token !== "your_github_personal_access_token" && token !== "ghp_xxx") {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export async function searchReposByTopic(
  topic: string,
  page = 1,
  perPage = 20
): Promise<GitHubSearchResponse> {
  const query = encodeURIComponent(
    `topic:${topic} stars:>100`
  )
  const url = `${GITHUB_API}/search/repositories?q=${query}&sort=stars&order=desc&page=${page}&per_page=${perPage}`

  const res = await fetch(url, { headers: getHeaders() })
  if (!res.ok) {
    throw new Error(`GitHub search failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function getRepo(owner: string, repo: string): Promise<GitHubRepo> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}`
  const res = await fetch(url, { headers: getHeaders() })
  if (!res.ok) {
    throw new Error(`GitHub repo fetch failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function getRepoReadme(
  owner: string,
  repo: string,
  defaultBranch = "main"
): Promise<string> {
  // Try to get the README via the API
  const url = `${GITHUB_API}/repos/${owner}/${repo}/readme`
  const res = await fetch(url, {
    headers: {
      ...getHeaders(),
      Accept: "application/vnd.github.v3.raw",
    },
  })

  if (res.ok) {
    const text = await res.text()
    // Truncate if too large (max ~8000 chars for LLM)
    return text.slice(0, 15000)
  }

  // Fallback: try raw URL
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/README.md`
  const rawRes = await fetch(rawUrl)
  if (rawRes.ok) {
    const text = await rawRes.text()
    return text.slice(0, 15000)
  }

  return ""
}

const AI_TOPICS = [
  "artificial-intelligence",
  "machine-learning",
  "deep-learning",
  "llm",
  "large-language-model",
  "gpt",
  "transformer",
  "nlp",
  "natural-language-processing",
  "computer-vision",
  "stable-diffusion",
  "generative-ai",
  "rag",
  "agent",
  "langchain",
  "openai",
  "llama",
  "fine-tuning",
  "vector-database",
  "embedding",
]

/**
 * Map a raw GitHub repo to the fields stored on our Project model (without README,
 * which is fetched separately and may be null). Centralizing this keeps the 4
 * import paths (cron, API, server action, seed) in sync.
 */
export function projectDataFromRepo(repo: GitHubRepo) {
  return {
    githubId: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language,
    topics: JSON.stringify(repo.topics || []),
    license: repo.license?.spdx_id ?? null,
    homepage: repo.homepage,
    defaultBranch: repo.default_branch,
    lastPushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
  }
}

export async function discoverAIProjects(
  topicCount = 5
): Promise<GitHubRepo[]> {
  const allRepos: GitHubRepo[] = []
  const seen = new Set<number>()

  for (const topic of AI_TOPICS.slice(0, topicCount)) {
    try {
      const result = await searchReposByTopic(topic, 1, 10)
      for (const repo of result.items) {
        if (!seen.has(repo.id)) {
          seen.add(repo.id)
          allRepos.push(repo)
        }
      }
      // Rate limit protection
      await new Promise((r) => setTimeout(r, 1000))
    } catch (e) {
      console.error(`Failed to search topic ${topic}:`, e)
    }
  }

  return allRepos.sort((a, b) => b.stargazers_count - a.stargazers_count)
}
