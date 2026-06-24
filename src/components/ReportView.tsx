"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Badge } from "@/components/ui/badge"
import { MermaidRenderer } from "./MermaidRenderer"
import { IllustrationGrid } from "./IllustrationGrid"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import type { ReportDetail } from "@/types"
import {
  Cpu,
  Target,
  Calendar,
  Layers,
  GraduationCap,
  PenTool,
} from "lucide-react"

interface ReportViewProps {
  report: ReportDetail
}

const difficultyConfig: Record<string, { label: string; color: string; desc: string }> = {
  beginner: {
    label: "🟢 入门级",
    color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200",
    desc: "适合 AI 初学者，了解基本概念即可上手",
  },
  intermediate: {
    label: "🟡 进阶级",
    color: "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800 text-amber-800 dark:text-amber-200",
    desc: "需要一定的 AI/ML 基础，理解核心算法原理",
  },
  advanced: {
    label: "🔴 专家级",
    color: "bg-rose-50 border-rose-200 dark:bg-rose-950 dark:border-rose-800 text-rose-800 dark:text-rose-200",
    desc: "面向有丰富经验的开发者，涉及底层优化和前沿技术",
  },
}

export function ReportView({ report }: ReportViewProps) {
  const diff = difficultyConfig[report.difficulty] ?? difficultyConfig.intermediate

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <p className="text-2xl font-bold text-foreground leading-snug">
              {report.summary}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(report.generatedAt)} 由 DeepSeek 深度分析</span>
            </div>
          </div>
          <div className={`shrink-0 rounded-lg border px-4 py-3 text-sm ${diff.color}`}>
            <p className="font-semibold">{diff.label}</p>
            <p className="text-xs mt-0.5 opacity-80">{diff.desc}</p>
          </div>
        </div>
      </div>

      {/* Overview */}
      <SectionCard icon={<Target className="h-5 w-5" />} title="项目定位与竞品分析">
        <MarkdownContent content={report.overview} />
      </SectionCard>

      {/* Architecture */}
      {report.architecture && (
        <SectionCard icon={<Layers className="h-5 w-5" />} title="架构深度解析">
          <MarkdownContent content={report.architecture} />
        </SectionCard>
      )}

      {/* Key Technologies */}
      {report.keyTechs.length > 0 && (
        <SectionCard icon={<Cpu className="h-5 w-5" />} title="关键技术栈">
          <div className="flex flex-wrap gap-2">
            {report.keyTechs.map((tech, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="px-3 py-1.5 text-sm font-medium"
              >
                {tech}
              </Badge>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 小黑概念配图：DeepSeek 已给出 shot list，前端自动逐张调 Agnes 生成。 */}
      {report.illustrationsPlan && report.illustrationsPlan.length > 0 && (
        <SectionCard icon={<PenTool className="h-5 w-5" />} title="核心概念配图 · 小黑">
          <p className="mb-4 text-xs text-muted-foreground">
            把这份报告里最有记忆点的判断、数据流和隐喻，画成一张张白底手绘的「小黑」配图。
            配图自动逐张生成，约 10 秒一张。
          </p>
          <IllustrationGrid
            reportId={report.id}
            plan={report.illustrationsPlan}
            initial={report.illustrations ?? []}
          />
        </SectionCard>
      )}

      {/* Learning Value */}
      {report.learningValue && (
        <SectionCard icon={<GraduationCap className="h-5 w-5" />} title="学习指南">
          <MarkdownContent content={report.learningValue} />
        </SectionCard>
      )}
    </div>
  )
}

// Shared markdown renderer: intercepts ```mermaid blocks → rendered diagrams
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            const codeStr = String(children).replace(/\n$/, "")

            if (match && match[1] === "mermaid") {
              return <MermaidRenderer chart={codeStr} />
            }

            if (!match) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }

            return (
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden border-l-4 border-l-primary/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
