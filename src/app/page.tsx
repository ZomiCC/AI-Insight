import Link from "next/link"
import { auth } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, BarChart3, Zap } from "lucide-react"
import { GithubIcon } from "@/components/Icons"

export default async function Home() {
  const session = await auth()

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Brain className="h-6 w-6 text-primary" />
            GitHub AI Insight
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <Link href="/dashboard" className={buttonVariants()}>
                进入 Dashboard
              </Link>
            ) : (
              <Link href="/login" className={buttonVariants()}>
                GitHub 登录
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="mx-auto max-w-4xl px-4 py-24 text-center">
          <Badge variant="secondary" className="mb-6">
            Powered by AI · DeepSeek
          </Badge>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight">
            用 AI 读懂
            <br />
            GitHub 上的每个 AI 项目
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            每天有数千个 AI 开源项目诞生，但你不可能读完每个
            README。
            <br />
            我们让 AI 替你深度分析每个项目，生成结构化的学习报告——
            <br />
            一句话总结、架构亮点、关键技术、学习建议，一目了然。
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              <GithubIcon className="h-5 w-5" />
              GitHub 登录开始使用
            </Link>
            <Link
              href="#features"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              了解更多
            </Link>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="mb-12 text-center text-3xl font-bold">
            怎么帮你学习？
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <Card>
              <CardHeader>
                <BarChart3 className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>热门项目排行</CardTitle>
                <CardDescription>
                  实时追踪 GitHub 上最热门的 AI 项目，按 Stars
                  排序，第一时间发现值得关注的仓库。
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Brain className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>AI 深度分析</CardTitle>
                <CardDescription>
                  DeepSeek 深度解读每个项目的 README、代码结构、技术栈，生成结构化的中文分析报告。
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Zap className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>学习路线指导</CardTitle>
                <CardDescription>
                  每个报告包含学习建议：适合什么人学、需要什么前置知识、推荐从哪里开始。
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Stats preview */}
        <section className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">
            覆盖 Transformer、LLM、Agent、RAG、Stable Diffusion 等
            <br />
            所有 AI 热门赛道的前沿项目
          </p>
          <div className="mt-8 flex justify-center gap-12">
            <div>
              <div className="text-3xl font-bold">100+</div>
              <div className="text-sm text-muted-foreground">已分析项目</div>
            </div>
            <div>
              <div className="text-3xl font-bold">日更</div>
              <div className="text-sm text-muted-foreground">数据刷新频率</div>
            </div>
            <div>
              <div className="text-3xl font-bold">6 维</div>
              <div className="text-sm text-muted-foreground">分析维度</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Built with Next.js · DeepSeek AI · GitHub API
      </footer>
    </div>
  )
}
