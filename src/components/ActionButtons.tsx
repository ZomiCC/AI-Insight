"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Heart, Sparkles, XCircle, Loader2 } from "lucide-react"
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
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    hasReport ? "success" : "idle"
  )
  const [progress, setProgress] = useState(0)
  const [phaseMsg, setPhaseMsg] = useState("")
  const [partialText, setPartialText] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      // cleanup on unmount
    }
  }, [])

  // Auto-scroll streaming text
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [partialText])

  const handleAnalyze = () => {
    setStatus("loading")
    setProgress(0)
    setPartialText("")
    setErrorMsg("")

    const es = new EventSource(`/api/projects/${projectId}/analyze/stream`)

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

      if (data.partialText) {
        const text = data.partialText
        // Try to extract readable content from the JSON stream
        const cleaned = text
          .replace(/^```json\s*/g, "")
          .replace(/```/g, "")
        setPartialText(cleaned)
      }

      if (data.phase === "done") {
        setStatus("success")
        es.close()
        // Auto-refresh to show the new report
        setTimeout(() => router.refresh(), 500)
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

  // Already analyzed: offer a compact "re-analyze" button (used next to the
  // report heading on the project detail page).
  if (status === "success") {
    return (
      <Button variant="outline" size="sm" onClick={() => handleAnalyze()}>
        <Sparkles className="mr-1.5 h-4 w-4" />
        重新分析
      </Button>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <XCircle className="h-4 w-4" />
          {errorMsg}
        </span>
        <Button size="sm" onClick={() => handleAnalyze()}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          重试
        </Button>
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-3 w-full max-w-2xl">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          <span className="text-sm font-medium">{phaseMsg}</span>
          <span className="text-sm text-muted-foreground ml-auto tabular-nums">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Streaming text preview */}
        {partialText && (
          <div
            ref={scrollRef}
            className="max-h-64 overflow-y-auto rounded-lg border bg-muted/30 p-4"
          >
            <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground leading-relaxed">
              {partialText}
            </pre>
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
          </div>
        )}
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
