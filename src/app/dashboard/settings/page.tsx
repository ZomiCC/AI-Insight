import Link from "next/link"
import { auth } from "@/lib/auth"
import {
  getUserApiKeyMasked,
  getUserAgnesKeyMasked,
  getUserCustomPrompt,
  getUserDiscoverKeywords,
} from "@/lib/userSettings"
import { DeepSeekKeyForm } from "@/components/DeepSeekKeyForm"
import { AgnesKeyForm } from "@/components/AgnesKeyForm"
import { DiscoverKeywordsForm } from "@/components/DiscoverKeywordsForm"
import { CustomPromptForm } from "@/components/CustomPromptForm"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { KeyRound, ExternalLink, ShieldCheck, Compass, Sparkles } from "lucide-react"

export default async function SettingsPage() {
  const session = await auth()
  const userId = session?.user?.id ?? null
  const [maskedKey, maskedAgnesKey, keywords, customPrompt] = userId
    ? await Promise.all([
        getUserApiKeyMasked(userId),
        getUserAgnesKeyMasked(userId),
        getUserDiscoverKeywords(userId),
        getUserCustomPrompt(userId),
      ])
    : [null, null, null, null]

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-primary" />
          设置
        </h1>
        <p className="text-muted-foreground mt-1">
          配置 API Key、关注的项目关键词，以及自定义分析提示词
        </p>
      </div>

      <DeepSeekKeyForm currentKeyMasked={maskedKey} />

      <AgnesKeyForm currentKeyMasked={maskedAgnesKey} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          项目发现与分析
        </h2>
        <DiscoverKeywordsForm currentKeywords={keywords ?? []} />
        <CustomPromptForm currentPrompt={customPrompt} />
      </section>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            关于数据安全
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            · API Key 使用 <strong>AES-256-GCM</strong> 加密后存储，任何人都无法看到明文。
          </p>
          <p>· Key 仅在你本人触发分析时于服务端解密调用 DeepSeek，不会下发浏览器。</p>
          <p>· 关键词与自定义提示词按你的账号保存，仅影响你自己的发现与分析结果。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            自定义提示词怎么用？
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>· 系统已内置专业的项目分析提示词，可覆盖绝大多数场景。</p>
          <p>· 若你有特定关注点（如性能、安全、RAG 实现），填写后会追加到系统提示词末尾。</p>
          <p>· 关键词是 GitHub topic（如 <code className="rounded bg-muted px-1">llm</code>、<code className="rounded bg-muted px-1">agent</code>），用于「发现项目」时按你关心的方向搜索。</p>
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
