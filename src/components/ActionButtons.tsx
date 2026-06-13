"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Heart, Sparkles } from "lucide-react"
import { toggleFavorite, triggerAnalysis } from "@/lib/actions"

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
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
        <Heart
          className={`mr-1 h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`}
        />
        {favorited ? "已收藏" : "收藏"}
      </SubmitButton>
    </form>
  )
}

export function AnalyzeButton({ projectId }: { projectId: string }) {
  return (
    <form action={triggerAnalysis.bind(null, projectId)}>
      <SubmitButton variant="default">
        <Sparkles className="mr-2 h-4 w-4" />
        AI 分析此项目
      </SubmitButton>
    </form>
  )
}
