import { analyzeProject } from "@/lib/analyzer"
import { requireUserId } from "@/lib/auth"
import { getUserApiKey } from "@/lib/userSettings"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Guard: analysis spends DeepSeek quota, so it must be a logged-in user.
  const userId = await requireUserId()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const apiKey = await getUserApiKey(userId)

  try {
    const report = await analyzeProject(id, apiKey)
    return Response.json({ success: true, report })
  } catch (error) {
    console.error("Analysis failed:", error)
    return Response.json(
      { error: "Analysis failed", details: String(error) },
      { status: 500 }
    )
  }
}
