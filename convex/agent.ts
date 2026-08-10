"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { requireUser } from "./auth";

const JARVIS_INSTRUCTIONS = `You are Jarvis, a calm, precise, quietly witty AI chief of staff with the composed confidence of a seasoned British aide. Address the user as "sir" sparingly and naturally.

Operational rules:
- Use tools proactively. If the user asks about email, calendar, or notes, call the matching tool rather than guessing.
- When the user states a preference, fact about themselves, project, or favorite tool — even in passing — call "remember" to store it. Confirm briefly: "Noted."
- If a tool reports a service is not connected, offer to connect it. If the user agrees, call "connect_service".
- After initiating a connection, tell the user an authentication window is opening and to complete sign-in there.
- "What can you connect to?" → call "list_services" and summarize.
- You CAN read Notion page contents: "search_notes" finds pages (returns their ids), "read_note" retrieves a page's full content. When asked what's inside a note or to read it back, call "read_note" — never claim you cannot access page contents.
- "Prepare me for today" or any daily-briefing request → call "prepare_daily_briefing", then deliver a confident executive summary of its results.
- If asked what you know about the user, call "recall" and summarize warmly.
- To-dos live natively in this platform (not Notion). Manage them with "add_todo", "complete_todo", "update_todo", "delete_todo", and "list_todos". Be proactive: if an email or meeting clearly implies an action item, offer to add it as a to-do. When the user references a to-do loosely, call "list_todos" first to find the right title.
- Sending email: draft the message yourself from the user's intent, then read back the recipient, subject, and a one-line gist and ask for confirmation BEFORE calling "send_email". Never send without explicit confirmation. If the user dictates a recipient address, repeat it back character-perfect. After sending, confirm briefly.
- Report failures honestly and suggest the next step. Never invent data.`;

const JARVIS_TOOLS = [
  {
    type: "function",
    name: "get_emails",
    description: "Fetch emails from the user's connected Gmail account. Defaults to unread messages.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Gmail search query, e.g. 'is:unread', 'from:sarah', 'subject:invoice'. Default 'is:unread'.",
        },
        max_results: { type: "number", description: "Max messages to fetch (default 10)." },
      },
    },
  },
  {
    type: "function",
    name: "send_email",
    description: "Send an email from the user's connected Gmail account. ONLY call this after the user has confirmed the recipient, subject, and message content.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address." },
        subject: { type: "string" },
        body: {
          type: "string",
          description: "Plain-text email body. Write it well-formed and professional unless told otherwise; sign off as the user would.",
        },
        cc: {
          type: "array",
          items: { type: "string" },
          description: "Optional CC addresses.",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    type: "function",
    name: "get_calendar_events",
    description: "List events from the user's Google Calendar. Defaults to the rest of today.",
    parameters: {
      type: "object",
      properties: {
        time_min: { type: "string", description: "ISO 8601 lower bound. Defaults to now." },
        time_max: {
          type: "string",
          description: "ISO 8601 upper bound. Defaults to end of today.",
        },
        max_results: { type: "number" },
      },
    },
  },
  {
    type: "function",
    name: "create_calendar_event",
    description: "Create a new Google Calendar event.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Event title." },
        start_datetime: {
          type: "string",
          description: "Event start in ISO 8601 local time, e.g. '2026-08-05T14:00:00'. Resolve relative dates yourself using current date/time.",
        },
        duration_minutes: { type: "number", description: "Duration in minutes (default 30)." },
        description: { type: "string" },
        timezone: { type: "string", description: "IANA timezone, e.g. 'Asia/Kolkata'." },
      },
      required: ["summary", "start_datetime"],
    },
  },
  {
    type: "function",
    name: "search_notes",
    description: "Search the user's Notion workspace for pages and documents.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search text. Empty string returns recent pages." },
        max_results: { type: "number" },
      },
    },
  },
  {
    type: "function",
    name: "read_note",
    description: "Read the full content of a Notion page (rendered as Markdown) so you can summarize it or read it back. Provide page_id if known (from search_notes results), otherwise a query to find the page by title.",
    parameters: {
      type: "object",
      properties: {
        page_id: { type: "string", description: "Notion page UUID, if already known." },
        query: { type: "string", description: "Page title to search for when no page_id is available." },
        title: { type: "string", description: "Display title, if known." },
      },
    },
  },
  {
    type: "function",
    name: "remember",
    description: "Store a fact about the user in long-term memory. Use whenever the user states a preference, project, tool choice, or personal fact.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["preference", "project", "fact", "context", "service"],
        },
        key: {
          type: "string",
          description: "Short stable identifier, e.g. 'favorite editor', 'current project'.",
        },
        value: { type: "string", description: "The fact itself, e.g. 'Cursor'." },
      },
      required: ["category", "key", "value"],
    },
  },
  {
    type: "function",
    name: "recall",
    description: "Retrieve everything Jarvis remembers about the user.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "forget",
    description: "Remove a remembered fact by its key.",
    parameters: {
      type: "object",
      properties: { key: { type: "string" } },
      required: ["key"],
    },
  },
  {
    type: "function",
    name: "add_todo",
    description: "Add a to-do item to the user's native task list.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short, action-oriented title." },
        priority: { type: "string", enum: ["high", "normal", "low"] },
        due_date: {
          type: "string",
          description: "Optional due date/time in ISO 8601 WITH timezone offset. Resolve relative phrases like 'by Friday evening' yourself.",
        },
        notes: { type: "string", description: "Optional extra context." },
      },
      required: ["title"],
    },
  },
  {
    type: "function",
    name: "complete_todo",
    description: "Mark a to-do as done. Matches by (partial) title.",
    parameters: {
      type: "object",
      properties: { title: { type: "string" } },
      required: ["title"],
    },
  },
  {
    type: "function",
    name: "update_todo",
    description: "Edit an existing to-do: rename it, change priority, set or move a due date, add notes, or reopen a completed one.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Current (partial) title to match." },
        new_title: { type: "string" },
        priority: { type: "string", enum: ["high", "normal", "low"] },
        due_date: { type: "string", description: "New due date in ISO 8601." },
        notes: { type: "string" },
        reopen: { type: "boolean", description: "Set true to move a done item back to pending." },
      },
      required: ["title"],
    },
  },
  {
    type: "function",
    name: "delete_todo",
    description: "Delete a to-do entirely. Matches by (partial) title.",
    parameters: {
      type: "object",
      properties: { title: { type: "string" } },
      required: ["title"],
    },
  },
  {
    type: "function",
    name: "list_todos",
    description: "List the user's pending and recently completed to-dos.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "list_services",
    description: "List all external services Jarvis can connect to, with their current status.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "connect_service",
    description: "Begin OAuth connection flow for an external service (gmail, google calendar, notion).",
    parameters: {
      type: "object",
      properties: {
        service: { type: "string", description: "Service name, e.g. 'gmail', 'notion', 'google calendar'." },
      },
      required: ["service"],
    },
  },
  {
    type: "function",
    name: "prepare_daily_briefing",
    description: "Gather email, calendar, and notes from all connected services and compile a daily briefing.",
    parameters: { type: "object", properties: {} },
  },
];

export const chat = action({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    // 1. Get the DeepSeek API Key. Prioritize DEEPSEEK_API_KEY, fallback to OPENAI_API_KEY.
    const apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY;
    const isDeepSeek = !!process.env.DEEPSEEK_API_KEY;
    const baseUrl = isDeepSeek ? "https://api.deepseek.com" : "https://api.openai.com/v1";
    const model = isDeepSeek ? "deepseek-chat" : "gpt-4o-mini";

    const assistantItemId = "assistant_" + Math.random().toString(36).slice(2, 9);

    if (!apiKey) {
      const errText = "Error: DEEPSEEK_API_KEY is not configured on the Convex dashboard. Please add it to your Convex env variables.";
      await ctx.runMutation(api.messages.finalize, {
        itemId: assistantItemId,
        role: "assistant",
        text: errText,
      });
      return;
    }

    // Indicate that Jarvis is thinking
    await ctx.runMutation(api.voiceState.set, { orbState: "thinking", sessionActive: true });

    // 2. Fetch operator profile & memory facts for personalizing the system instructions
    let profileSection = "";
    try {
      const profile = await ctx.runQuery(api.profiles.get, {});
      if (profile) {
        const lines = [
          profile.displayName && `- Name: ${profile.displayName} (address them by name)`,
          profile.role && `- Role: ${profile.role}`,
          profile.company && `- Company: ${profile.company}`,
          profile.location && `- Location: ${profile.location}`,
          profile.timezone && `- Timezone: ${profile.timezone} (use for all times and scheduling)`,
          profile.communicationStyle && `- Preferred communication style: ${profile.communicationStyle}`,
          profile.signOff && `- Email sign-off to use when sending email: "${profile.signOff}"`,
          profile.notes && `- Additional context: ${profile.notes}`,
        ].filter(Boolean);
        if (lines.length > 0) {
          profileSection = `\n\nOperator profile (treat as ground truth about the user):\n${lines.join("\n")}`;
        }
      }
    } catch (e) {
      // ignore
    }

    const now = new Date();
    const systemPrompt =
      JARVIS_INSTRUCTIONS +
      profileSection +
      `\n\nActive Timezone: ${process.env.TZ ?? "UTC"}.\nCurrent date and time: ${now.toString()}. Use this to resolve relative dates.`;

    // 3. Load latest message history
    const historyMessages = await ctx.runQuery(api.messages.list, {});
    const apiHistory = historyMessages
      .filter((m) => m.status === "final" || m.status === "interrupted")
      .slice(-15) // Keep last 15 messages for context
      .map((m) => ({
        role: m.role,
        content: m.text,
      }));

    // Add current message to prompt context
    apiHistory.push({ role: "user", content: args.message });

    const toolsConfig = JARVIS_TOOLS.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    // 4. Run the completion loop
    let messagesPayload = [
      { role: "system", content: systemPrompt },
      ...apiHistory,
    ];

    let attempts = 0;
    const maxAgentLoops = 4;
    let finalOutputText = "";

    while (attempts < maxAgentLoops) {
      attempts++;
      
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: messagesPayload,
          tools: toolsConfig,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await ctx.runMutation(api.messages.finalize, {
          itemId: assistantItemId,
          role: "assistant",
          text: `Failed to contact AI service: ${response.status} ${errorText.slice(0, 150)}`,
        });
        await ctx.runMutation(api.voiceState.set, { orbState: "idle", sessionActive: true });
        return;
      }

      await ctx.runMutation(api.voiceState.set, { orbState: "speaking", sessionActive: true });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let deltaText = "";
      const toolCallsAcc: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            if (dataStr === "[DONE]") break;
            try {
              const data = JSON.parse(dataStr);
              const choice = data.choices?.[0];
              const content = choice?.delta?.content ?? "";
              const tcs = choice?.delta?.tool_calls;

              if (content) {
                deltaText += content;
                finalOutputText += content;
                // Stream text to user screen
                await ctx.runMutation(api.messages.upsertStreaming, {
                  itemId: assistantItemId,
                  role: "assistant",
                  text: finalOutputText,
                });
              }

              if (tcs) {
                for (const tc of tcs) {
                  const idx = tc.index;
                  if (!toolCallsAcc[idx]) {
                    toolCallsAcc[idx] = { id: tc.id, name: tc.function?.name ?? "", arguments: "" };
                  }
                  if (tc.id) toolCallsAcc[idx].id = tc.id;
                  if (tc.function?.name) toolCallsAcc[idx].name = tc.function.name;
                  if (tc.function?.arguments) {
                    toolCallsAcc[idx].arguments += tc.function.arguments;
                  }
                }
              }
            } catch (err) {
              // ignore JSON parsing errors for partial streams
            }
          }
        }
      }

      const finalToolCalls = toolCallsAcc.filter(Boolean);

      // If there are no tool calls, this completion is the final answer!
      if (finalToolCalls.length === 0) {
        await ctx.runMutation(api.messages.finalize, {
          itemId: assistantItemId,
          role: "assistant",
          text: finalOutputText,
        });
        await ctx.runMutation(api.voiceState.set, { orbState: "idle", sessionActive: true });
        return;
      }

      // If we got tool calls, we execute them and repeat the loop.
      // Append the assistant message requesting tool calls to history.
      const assistantMsg = {
        role: "assistant",
        content: deltaText || null,
        tool_calls: finalToolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.arguments },
        })),
      };
      messagesPayload.push(assistantMsg as any);

      await ctx.runMutation(api.voiceState.set, { orbState: "thinking", sessionActive: true });

      // Run tools in parallel
      const toolResults = await Promise.all(
        finalToolCalls.map(async (tc) => {
          let argsParsed = {};
          try {
            argsParsed = JSON.parse(tc.arguments);
          } catch (e) {
            // ignore
          }

          try {
            const toolResult = await ctx.runAction(api.tools.runTool, {
              name: tc.name,
              args: argsParsed,
            });
            return {
              role: "tool",
              tool_call_id: tc.id,
              name: tc.name,
              content: JSON.stringify(toolResult),
            };
          } catch (err) {
            return {
              role: "tool",
              tool_call_id: tc.id,
              name: tc.name,
              content: JSON.stringify({ error: String(err) }),
            };
          }
        })
      );

      // Append tool execution outputs to history
      messagesPayload.push(...(toolResults as any[]));
    }

    // Final fallback if limit exceeded
    await ctx.runMutation(api.messages.finalize, {
      itemId: assistantItemId,
      role: "assistant",
      text: finalOutputText || "Sorry, I hit an execution loop limit. Standing by.",
    });
    await ctx.runMutation(api.voiceState.set, { orbState: "idle", sessionActive: true });
  },
});
