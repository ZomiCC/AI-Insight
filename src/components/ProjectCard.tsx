"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, GitFork, Heart } from "lucide-react"
import { formatNumber, timeAgo } from "@/lib/utils"
import type { ProjectListItem } from "@/types"
import { useState } from "react"

interface ProjectCardProps {
  project: ProjectListItem
  favorited?: boolean
  showFavorite?: boolean
}

export function ProjectCard({
  project,
  favorited = false,
  showFavorite = false,
}: ProjectCardProps) {
  const [isFav, setIsFav] = useState(favorited)
  const [loading, setLoading] = useState(false)

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      if (isFav) {
        await fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id }),
        })
        setIsFav(false)
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id }),
        })
        setIsFav(true)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const latestReport = project.reports[0]
  const difficultyColor = {
    beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    intermediate:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  }

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <Card className="group h-full transition-shadow hover:shadow-md cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                {project.fullName}
              </CardTitle>
              <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  {formatNumber(project.stars)}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="h-3.5 w-3.5" />
                  {formatNumber(project.forks)}
                </span>
                {project.language && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                    {project.language}
                  </span>
                )}
              </div>
            </div>
            {showFavorite && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleFavorite}
                disabled={loading}
              >
                <Heart
                  className={`h-4 w-4 ${
                    isFav
                      ? "fill-red-500 text-red-500"
                      : "text-muted-foreground"
                  }`}
                />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {project.description ?? "暂无描述"}
          </p>

          {latestReport ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{latestReport.summary}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className={difficultyColor[latestReport.difficulty as keyof typeof difficultyColor] ?? ""}
                >
                  {latestReport.difficulty === "beginner"
                    ? "入门"
                    : latestReport.difficulty === "advanced"
                      ? "进阶"
                      : "中级"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {timeAgo(latestReport.generatedAt)} 分析
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              待分析
            </div>
          )}

          {project.topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {project.topics.slice(0, 5).map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export function ProjectCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/3 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-3" />
        <Skeleton className="h-5 w-1/2 mb-2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
      </CardContent>
    </Card>
  )
}
