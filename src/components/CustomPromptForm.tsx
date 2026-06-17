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
import { saveCustomPrompt } from "@/lib/actions"
import { CheckCircle, XCircle, Loader2, RotateCcw } from "lucide-react"

interface Props {
  /** Current custom prompt, or null if none configured. */
  currentPrompt: string | null
}

const PLACEHOLDER =
  "例如：\n请额外从「性能优化」和「工程实践」两个角度展开分析。\n重点对比该项目与其他主流方案在推理速度上的差异。"

export function CustomPromptForm({ currentPrompt }: Props) {
  const [value, setValue] = useState(currentPrompt ?? "")
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null)
  const router = useRouter()

  const isCustom = !!currentPrompt

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    startTransition(async () => {
      const res = await saveCustomPrompt(value)
      if (res?.ok) {
        setMsg({
          type: "ok",
          text: value.trim() ? "自定义提示词已保存" : "已清空，将仅使用系统提示词",
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
      await saveCustomPrompt("")
      setMsg({ type: "ok", text: "已清空自定义提示词" })
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>自定义分析提示词</CardTitle>
        <CardDescription>
          {isCustom
            ? "已配置自定义提示词。它会被拼接到系统内置提示词之后，引导 AI 按你的关注点分析。留空保存即可清除。"
            : "可选。填入后，分析时这段文字会拼接到系统提示词之后，让 AI 按你的关注点生成报告（最多 2000 字）。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSave} className="space-y-3">
          <Textarea
            placeholder={PLACEHOLDER}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
            rows={6}
          />
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存提示词"
              )}
            </Button>
            {isCustom && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={pending}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                清除
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
