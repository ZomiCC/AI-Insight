import { analyzeProjectStream } from "@/lib/analyzer-stream"
import { requireUserId } from "@/lib/auth"
import { getUserApiKey } from "@/lib/userSettings"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Guard: streaming analysis also spends DeepSeek quota.
  const userId = await requireUserId()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const apiKey = await getUserApiKey(userId)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        await analyzeProjectStream(id, apiKey, (event) => {
          send(event)
        })
      } catch {
        send({ phase: "error", progress: 0, message: "分析过程出错" })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
