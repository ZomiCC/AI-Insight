/**
 * 种子数据脚本
 * 运行: npx tsx prisma/seed.ts
 *
 * 从 GitHub 拉取热门 AI 项目并写入数据库。
 * 需要先在 .env 中配置 GITHUB_TOKEN（可选，但有 Token 可避免限流）。
 */

import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { discoverAIProjects, getRepoReadme, projectDataFromRepo } from "../src/lib/github"

async function main() {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  })
  const prisma = new PrismaClient({ adapter })

  console.log("🔍 正在从 GitHub 发现热门 AI 项目...\n")

  const repos = await discoverAIProjects(3)

  let added = 0
  let skipped = 0

  for (const repo of repos) {
    const existing = await prisma.project.findUnique({
      where: { githubId: repo.id },
    })

    if (existing) {
      skipped++
      console.log(`⏭️  跳过已存在: ${repo.full_name}`)
      continue
    }

    let readme: string | null = null
    try {
      console.log(`📄 获取 ${repo.full_name} 的 README...`)
      readme = await getRepoReadme(
        repo.full_name.split("/")[0],
        repo.full_name.split("/")[1],
        repo.default_branch
      )
    } catch {
      console.log(`⚠️  无法获取 ${repo.full_name} 的 README`)
    }

    await prisma.project.create({
      data: { ...projectDataFromRepo(repo), readme },
    })

    added++
    console.log(`✅ 已添加: ${repo.full_name} (⭐ ${repo.stargazers_count})`)

    // 避免 GitHub API 限流
    await new Promise((r) => setTimeout(r, 1000))
  }

  console.log(`\n📊 完成! 新增 ${added} 个项目，跳过 ${skipped} 个已存在的项目。`)
  console.log("💡 运行 `npm run dev` 启动网站，访问 /dashboard")
  console.log("💡 访问 /api/cron/refresh 触发 AI 批量分析")

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("❌ 种子脚本失败:", e)
  process.exit(1)
})
