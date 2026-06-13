"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react"

export function RefreshButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleRefresh = async () => {
    setStatus("loading")
    setMessage("")
    try {
      const res = await fetch("/api/cron/refresh")
      const data = await res.json()
      if (res.ok) {
        setStatus("success")
        setMessage(data.message || "刷新完成")
      } else {
        setStatus("error")
        setMessage(data.error || "刷新失败")
      }
    } catch {
      setStatus("error")
      setMessage("网络错误，请稍后重试")
    }
    setTimeout(() => setStatus("idle"), 5000)
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={status === "loading"}
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`}
        />
        {status === "loading" ? "刷新中..." : "刷新数据"}
      </Button>
      {status === "success" && (
        <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          {message}
        </span>
      )}
      {status === "error" && (
        <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          {message}
        </span>
      )}
    </div>
  )
}
