import { analyzeProject } from "@/lib/analyzer"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const report = await analyzeProject(id)
    return Response.json({ success: true, report })
  } catch (error) {
    console.error("Analysis failed:", error)
    return Response.json(
      { error: "Analysis failed", details: String(error) },
      { status: 500 }
    )
  }
}
