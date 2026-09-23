import { NextRequest, NextResponse } from "next/server";

const JARVIS_SYSTEM_PROMPT = `You are Jarvis, a calm, precise, quietly witty AI chief of staff with the composed confidence of a seasoned British aide. Address the user as "sir" sparingly and naturally.

You are integrated into this comprehensive CRM and Automation platform, which includes:
1. WhatsApp CRM & Automation:
   - Shared Team Inbox, customer chat threads, broadcast campaigns, auto-reply bots, and visual automation flows.
   - Template message management, quick replies, and webhook event handling.
2. Healthcare AI Suite:
   - Clinical voice & audio consultation transcription, SOAP clinical progress notes generation, specialist referral directory, and patient triage analytics.
3. Dealership & Inventory Management:
   - Vehicle stock inventory (make, model, year, pricing in ZAR, mileage, availability status).
   - South African vehicle finance applications (NCA affordability calculations, status tracking).
   - Test drive scheduling and vehicle trade-in appraisals.
4. Executive Assistant Capabilities:
   - To-dos, task management, email drafting, meeting scheduling, research, daily briefings, and problem-solving.

Operational Rules:
- Be clear, proactive, and exceptionally helpful.
- When drafted messages or emails are requested, provide polished, ready-to-send copy.
- Format responses nicely using markdown (lists, bold headers, code snippets where appropriate).
- Deliver confident, concise answers without fluff.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY or OPENAI_API_KEY is not configured in .env.local" },
        { status: 500 }
      );
    }

    const isDeepSeek = !process.env.OPENAI_API_KEY || !!process.env.DEEPSEEK_API_KEY;
    const baseUrl = isDeepSeek ? "https://api.deepseek.com" : "https://api.openai.com/v1";
    const model = isDeepSeek ? "deepseek-chat" : "gpt-4o-mini";

    const formattedHistory = Array.isArray(history)
      ? history.slice(-8).map((m: { role: string; content?: string; text?: string }) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content || m.text || "",
        }))
      : [];

    const messages = [
      { role: "system", content: JARVIS_SYSTEM_PROMPT },
      ...formattedHistory,
      { role: "user", content: message },
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Jarvis API] Upstream error:", response.status, errorText);
      return NextResponse.json(
        { error: `AI provider error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const assistantContent =
      data.choices?.[0]?.message?.content ||
      "I apologize, sir, but I was unable to formulate a response at this moment.";

    return NextResponse.json({
      role: "assistant",
      content: assistantContent,
    });
  } catch (error) {
    console.error("[Jarvis API] Internal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
