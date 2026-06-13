import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Brain } from "lucide-react"
import { GithubIcon } from "@/components/Icons"
import { signInWithGitHub } from "@/lib/actions"

export default async function LoginPage() {
  const session = await auth()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">登录 GitHub AI Insight</CardTitle>
          <CardDescription>
            使用 GitHub 账号登录，即可查看 AI 项目分析报告
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInWithGitHub}>
            <Button type="submit" className="w-full" size="lg">
              <GithubIcon className="mr-2 h-5 w-5" />
              使用 GitHub 登录
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-center text-sm text-muted-foreground">
          登录即表示你同意我们通过 GitHub API 获取公开仓库信息
        </CardFooter>
      </Card>
    </div>
  )
}
