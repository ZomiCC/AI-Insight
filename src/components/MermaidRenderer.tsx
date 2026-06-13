// @ts-nocheck
"use client"

import { useEffect, useRef, useState } from "react"

let initialized = false

async function renderMermaid(elementId: string, code: string): Promise<string | null> {
  const mermaid = await import("mermaid")
  if (!initialized) {
    mermaid.default.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "loose",
      fontFamily: "inherit",
      fontSize: 14,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: "basis",
        wrappingWidth: 200,
      },
    })
    initialized = true
  }

  // Preprocess: fix common LLM-generated mermaid syntax issues
  let fixed = code.trim()

  // Quote node labels containing special characters (commas, parens, colons, Chinese punct)
  fixed = fixed.replace(/\[([^\]]*)\]/g, (match, label) => {
    const trimmed = label.trim()
    // Only quote if label is non-empty and needs quoting
    if (trimmed && (trimmed.includes(",") || trimmed.includes("(") || trimmed.includes(":") || trimmed.includes(")") || trimmed.includes("；") || trimmed.includes("，") || trimmed.includes("）") || trimmed.includes("（"))) {
      return `["${trimmed}"]`
    }
    // Already quoted with double quotes
    if (match.startsWith('["')) return match
    // Already quoted with single
    if (match.startsWith("['")) return match
    return match
  })

  // Replace deprecated "graph" with "flowchart"
  if (/^\s*graph\s/i.test(fixed)) {
    fixed = fixed.replace(/^\s*graph/, "flowchart")
  }

  // Fix broken arrows (missing >)
  fixed = fixed.replace(/--(?!>)/g, "-->")

  const result = await mermaid.default.render(elementId, fixed)
  return result.svg
}

export function MermaidRenderer({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 9)}`)

  useEffect(() => {
    let cancelled = false
    renderMermaid(idRef.current, chart)
      .then((result) => {
        if (!cancelled && result) setSvg(result)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [chart, idRef])

  if (error) {
    return (
      <details className="my-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-amber-800 dark:text-amber-200">
          ⚠ 流程图渲染失败（点击展开原始代码）
        </summary>
        <pre className="px-4 pb-4 text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">{chart}</pre>
      </details>
    )
  }

  if (!svg) return null

  return (
    <div className="my-6">
      <div
        className={`group relative overflow-auto rounded-xl border bg-white p-4 shadow-sm dark:bg-zinc-900 cursor-zoom-in transition-all ${
          expanded
            ? "fixed inset-4 z-50 max-w-none cursor-zoom-out"
            : "max-h-[500px]"
        }`}
        onClick={() => setExpanded(!expanded)}
        title={expanded ? "点击缩小" : "点击放大查看完整流程图"}
      >
        <div
          className="flex justify-center min-w-max"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {!expanded && (
          <span className="absolute bottom-2 right-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            点击放大 🔍
          </span>
        )}
      </div>
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        />
      )}
    </div>
  )
}
