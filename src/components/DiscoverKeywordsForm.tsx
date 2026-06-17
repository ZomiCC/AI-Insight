"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { saveDiscoverKeywords } from "@/lib/actions"
import { CheckCircle, XCircle, Loader2, RotateCcw } from "lucide-react"

interface Props {
  /** Current keywords (empty array = using system defaults). */
  currentKeywords: string[]
}

export function DiscoverKeywordsForm({ currentKeywords }: Props) {
  const [value, setValue] = useState(currentKeywords.join("\n"))
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null)
  const router = useRouter()

  const isDefault = currentKeywords.length === 0

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    startTransition(async () => {
      const res = await saveDiscoverKeywords(value)
      if (res?.ok) {
        setMsg({
          type: "ok",
          text: value.trim() ? "关键词已保存" : "已清空，将使用系统默认关键词",
        })
        router.refresh()
      } else {
        setMsg({ type: "error", text: res && !res.ok ? res.error : "保存失败" })
      }
    })
  }

  const handleReset = () => {
    setValue("")
    setMsg(null)
    startTransition(async () => {
      await saveDiscoverKeywords("")
      setMsg({ type: "ok", text: "已恢复为系统默认关键词" })
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>发现项目关键词</CardTitle>
        <CardDescription>
          {isDefault
            ? "当前使用系统内置关键词。可自定义你想关注的 GitHub topic，每行一个（也支持逗号分隔），最多 20 个。"
            : `当前已自定义 ${currentKeywords.length} 个关键词。留空保存即可恢复系统默认。`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSave} className="space-y-3">
          <Textarea
            placeholder={"例如：\nllm\nagent\nrag\nstable-diffusion"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
            rows={6}
            className="font-mono"
          />
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存关键词"
              )}
            </Button>
            {!isDefault && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={pending}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                恢复默认
              </Button>
            )}
          </div>
        </form>

        {msg && (
          <div
            className={`flex items-center gap-1.5 text-sm ${
              msg.type === "ok"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {msg.type === "ok" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {msg.text}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
