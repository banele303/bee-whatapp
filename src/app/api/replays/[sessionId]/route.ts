import { NextResponse } from "next/server"
import { Browserbase } from "@browserbasehq/sdk"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const apiKey = process.env.BROWSERBASE_API_KEY

    if (!apiKey || !sessionId) {
      return NextResponse.json({ error: "Missing API Key or Session ID" }, { status: 400 })
    }

    const bb = new Browserbase({ apiKey })
    
    try {
      // Get session debug & recording links
      const debugUrls = await bb.sessions.debug(sessionId)
      if (debugUrls?.debuggerFullscreenUrl) {
        return NextResponse.json({ url: debugUrls.debuggerFullscreenUrl })
      }
    } catch {
      // If session debug is pending/completed
    }

    // Return 202 if processing
    return NextResponse.json({ status: "processing" }, { status: 202 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch session replay" }, { status: 500 })
  }
}
