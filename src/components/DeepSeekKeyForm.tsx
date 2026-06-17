"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { saveDeepSeekApiKey, deleteDeepSeekApiKey } from "@/lib/actions"
import { CheckCircle, XCircle, Loader2, Trash2 } from "lucide-react"

interface Props {
  /** Masked preview of the currently stored key (e.g. "sk-••••••••1234"), or null. */
  currentKeyMasked: string | null
}

export function DeepSeekKeyForm({ currentKeyMasked }: Props) {
  const [value, setValue] = useState("")
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null)
  const router = useRouter()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const key = value.trim()
    if (!key) {
      setMsg({ type: "error", text: "请输入 API Key" })
      return
    }
    setMsg(null)
    startTransition(async () => {
      const res = await saveDeepSeekApiKey(key)
      if (res?.ok) {
        setMsg({ type: "ok", text: "API Key 已保存" })
        setValue("")
        router.refresh()
      } else {
        setMsg({ type: "error", text: res && !res.ok ? res.error : "保存失败" })
      }
    })
  }

  const handleDelete = () => {
    setMsg(null)
    startTransition(async () => {
      await deleteDeepSeekApiKey()
      setMsg({ type: "ok", text: "API Key 已删除" })
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>DeepSeek API Key</CardTitle>
        <CardDescription>
          {currentKeyMasked
            ? `当前已配置：${currentKeyMasked}。输入新 Key 保存即可覆盖。`
            : "尚未配置。输入你的 DeepSeek API Key 后保存，即可使用 AI 分析功能。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSave} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Input
            type="password"
            autoComplete="off"
            placeholder="sk-..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
            className="sm:flex-1 font-mono"
          />
          <Button type="submit" disabled={pending || !value.trim()}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              currentKeyMasked ? "更新 Key" : "保存 Key"
            )}
          </Button>
        </form>

        {currentKeyMasked && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={pending}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            删除已保存的 Key
          </Button>
        )}

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
