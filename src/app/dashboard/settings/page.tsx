import Link from "next/link"
import { auth } from "@/lib/auth"
import { getUserApiKeyMasked } from "@/lib/userSettings"
import { DeepSeekKeyForm } from "@/components/DeepSeekKeyForm"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { KeyRound, ExternalLink, ShieldCheck } from "lucide-react"

export default async function SettingsPage() {
  const session = await auth()
  const maskedKey = session?.user?.id
    ? await getUserApiKeyMasked(session.user.id)
    : null

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-primary" />
          设置
        </h1>
        <p className="text-muted-foreground mt-1">
          配置你自己的 DeepSeek API Key，用于生成 AI 项目分析报告
        </p>
      </div>

      <DeepSeekKeyForm currentKeyMasked={maskedKey} />

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            关于 API Key 的安全
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            · 你的 Key 使用 <strong>AES-256-GCM</strong> 加密后存储在数据库，任何人都无法看到明文。
          </p>
          <p>· Key 仅在你本人触发项目分析时，于服务端解密并调用 DeepSeek，不会下发到浏览器。</p>
          <p>· 可随时在此修改或删除。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">如何获取 DeepSeek API Key？</CardTitle>
          <CardDescription>
            前往 DeepSeek 开放平台创建，复制以 <code className="rounded bg-muted px-1">sk-</code> 开头的 Key
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            打开 DeepSeek API Keys 页面
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
