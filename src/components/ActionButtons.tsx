"use client"

import { useState, useEffect, useRef } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Heart, Sparkles, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { toggleFavorite } from "@/lib/actions"

function SubmitButton({
  children,
  variant = "outline",
  size = "sm",
}: {
  children: React.ReactNode
  variant?: "outline" | "default" | "ghost"
  size?: "sm" | "default" | "lg"
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          处理中...
        </span>
      ) : (
        children
      )}
    </Button>
  )
}

export function FavoriteButton({
  projectId,
  favorited,
  enabled,
}: {
  projectId: string
  favorited: boolean
  enabled: boolean
}) {
  if (!enabled) return null

  return (
    <form action={toggleFavorite.bind(null, projectId)}>
      <SubmitButton variant="outline" size="sm">
        <Heart className={`mr-1 h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
        {favorited ? "已收藏" : "收藏"}
      </SubmitButton>
    </form>
  )
}

export function AnalyzeButton({
  projectId,
  hasReport,
}: {
  projectId: string
  hasReport: boolean
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    hasReport ? "success" : "idle"
  )
  const [progress, setProgress] = useState(0)
  const [phaseMsg, setPhaseMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const eventSourceRef = useRef<EventSource | null>(null)

  // cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  const handleAnalyze = () => {
    eventSourceRef.current?.close()
    setStatus("loading")
    setProgress(0)
    setErrorMsg("")

    const es = new EventSource(`/api/projects/${projectId}/analyze/stream`)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.phase === "error") {
        setStatus("error")
        setErrorMsg(data.message || "分析失败")
        es.close()
        return
      }

      setProgress(data.progress)
      setPhaseMsg(data.message)

      if (data.phase === "done") {
        setStatus("success")
        es.close()
      }
    }

    es.onerror = () => {
      es.close()
      if (status !== "success") {
        setStatus("error")
        setErrorMsg("连接中断，请重试")
      }
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <CheckCircle className="h-4 w-4" />
          分析完成
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAnalyze()}
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          重新分析
        </Button>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4" />
            {errorMsg}
          </span>
        </div>
        <Button size="sm" onClick={() => handleAnalyze()}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          重试
        </Button>
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-2 min-w-[300px]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium">{phaseMsg || "正在分析..."}</span>
          <span className="text-sm text-muted-foreground ml-auto">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <Button onClick={handleAnalyze} size="sm">
      <span className="flex items-center gap-1.5">
        <Sparkles className="h-4 w-4" />
        AI 分析此项目
      </span>
    </Button>
  )
}
