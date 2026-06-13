"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"
import { useCallback } from "react"

const LANGUAGES = [
  "Python",
  "JavaScript",
  "TypeScript",
  "Rust",
  "Go",
  "C++",
  "Java",
  "Jupyter Notebook",
]

const DIFFICULTIES = [
  { value: "beginner", label: "入门" },
  { value: "intermediate", label: "中级" },
  { value: "advanced", label: "进阶" },
]

export function SearchFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== "all") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete("page") // reset page on filter change
      router.push(`/dashboard?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索项目名称或描述..."
          className="pl-9"
          defaultValue={searchParams.get("query") ?? ""}
          onChange={(e) => {
            // Debounce: update on enter or after typing stops
            const value = e.target.value
            const params = new URLSearchParams(searchParams.toString())
            if (value) {
              params.set("query", value)
            } else {
              params.delete("query")
            }
            params.delete("page")
            // Use replace with debounce
            const timeout = setTimeout(() => {
              router.replace(`/dashboard?${params.toString()}`)
            }, 500)
            return () => clearTimeout(timeout)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const value = (e.target as HTMLInputElement).value
              updateParams("query", value)
            }
          }}
        />
      </div>
      <Select
        defaultValue={searchParams.get("language") ?? "all"}
        onValueChange={(v) => updateParams("language", v ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="编程语言" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部语言</SelectItem>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang} value={lang}>
              {lang}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("difficulty") ?? "all"}
        onValueChange={(v) => updateParams("difficulty", v ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="难度" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部难度</SelectItem>
          {DIFFICULTIES.map((d) => (
            <SelectItem key={d.value} value={d.value}>
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
