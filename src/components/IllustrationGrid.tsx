"use client"

import { useState, useEffect, useRef } from "react"
import { generateIllustration } from "@/lib/actions"
import type { IllustrationPlan, IllustrationItem } from "@/types"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

type Status = "idle" | "loading" | "done" | "error"

interface CellState {
  status: Status
  base64?: string
  error?: string
}

interface Props {
  reportId: string
  plan: IllustrationPlan[]
  /** 进入页面时已生成好的配图（刷新页面后从 DB 取到），标记为 done 跳过重复生成。 */
  initial: IllustrationItem[]
}

/**
 * 「小黑」配图网格：挂载后自动逐张调 Agnes 生成，每张一个 server action 请求，
 * 规避 Vercel Hobby 60s 超时；error 不阻塞后续；单张可重试；已生成不重复请求。
 *
 * 设计为「只启动一次」的串行队列（startedRef 守卫，避免 React 严格模式重复触发）。
 */
export function IllustrationGrid({ reportId, plan, initial }: Props) {
  const [cells, setCells] = useState<Record<number, CellState>>(() => {
    const m: Record<number, CellState> = {}
    for (const it of initial) {
      if (it.base64) m[it.index] = { status: "done", base64: it.base64 }
    }
    return m
  })
  const [zoom, setZoom] = useState<number | null>(null)
  const startedRef = useRef(false)

  // 生成单张（重试按钮共用此函数）。
  const generateOne = async (index: number) => {
    setCells((c) => ({ ...c, [index]: { status: "loading" } }))
    const res = await generateIllustration(reportId, index)
    if (res.ok) {
      setCells((c) => ({ ...c, [index]: { status: "done", base64: res.base64 } }))
    } else {
      setCells((c) => ({ ...c, [index]: { status: "error", error: res.error } }))
    }
  }

  // 挂载时启动串行队列：跳过已 done 的，逐张生成，error 后继续下一张。
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let cancelled = false
    ;(async () => {
      for (let i = 0; i < plan.length; i++) {
        if (cancelled) return
        if (cells[i]?.status === "done") continue
        await generateOne(i)
      }
    })()

    return () => {
      cancelled = true
    }
    // 只在挂载时跑一次；cells 用挂载时的快照判断已 done 项。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {plan.map((p, i) => {
          const cell = cells[i]
          const status = cell?.status ?? "idle"
          return (
            <figure key={i} className="space-y-2">
              <div className="group relative aspect-video w-full overflow-hidden rounded-lg border bg-white">
                {status === "done" && cell?.base64 ? (
                  <button
                    type="button"
                    onClick={() => setZoom(i)}
                    className="block h-full w-full cursor-zoom-in"
                    aria-label={`放大查看：${p.topic}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${cell.base64}`}
                      alt={`${p.topic}：${p.coreIdea}`}
                      className="h-full w-full object-contain"
                    />
                  </button>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
                    {status === "loading" && (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          正在生成第 {i + 1} 张…
                        </span>
                      </>
                    )}
                    {status === "error" && (
                      <>
                        <AlertCircle className="h-6 w-6 text-amber-500" />
                        <span className="text-xs text-muted-foreground">
                          {cell?.error ?? "生成失败"}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-1 h-7 text-xs"
                          onClick={() => generateOne(i)}
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          重试
                        </Button>
                      </>
                    )}
                    {status === "idle" && (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground/60">
                          排队中
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <figcaption className="space-y-1.5 px-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {p.topic}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                  {p.xiaohei}
                </p>
                {p.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {p.labels.map((label, li) => (
                      <Badge
                        key={li}
                        variant="outline"
                        className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </figcaption>
            </figure>
          )
        })}
      </div>

      {/* 放大查看 */}
      <Dialog open={zoom !== null} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="sm:max-w-3xl" showCloseButton>
          {zoom !== null && cells[zoom]?.base64 ? (
            <>
              <DialogTitle className="sr-only">
                {plan[zoom]?.topic}
              </DialogTitle>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${cells[zoom].base64}`}
                alt={plan[zoom]?.topic ?? ""}
                className="w-full rounded-lg bg-white"
              />
              <p className="text-center text-sm text-muted-foreground">
                {plan[zoom]?.topic}
                {plan[zoom]?.coreIdea ? ` — ${plan[zoom].coreIdea}` : ""}
              </p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
