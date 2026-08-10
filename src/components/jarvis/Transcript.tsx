"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import ReactMarkdown from "react-markdown";
import {
  Mail,
  CalendarDays,
  FileText,
  Sparkles,
  Send,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Quick-action tool buttons                                           */
/* ------------------------------------------------------------------ */

const QUICK_ACTIONS = [
  { icon: <Mail className="h-3.5 w-3.5" />, label: "Emails", command: "Check my unread emails" },
  { icon: <CalendarDays className="h-3.5 w-3.5" />, label: "Calendar", command: "What's on my calendar today?" },
  { icon: <FileText className="h-3.5 w-3.5" />, label: "Notes", command: "Search my Notion notes" },
  { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Briefing", command: "Prepare me for today" },
];

function QuickActions({ onAction }: { onAction: (cmd: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap pb-2 pt-1">
      {QUICK_ACTIONS.map((a) => (
        <button
          key={a.label}
          onClick={() => onAction(a.command)}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] tracking-wide text-white/50 transition hover:border-primary/30 hover:bg-primary/[0.07] hover:text-primary/80 active:scale-95"
        >
          <span className="text-primary/60">{a.icon}</span>
          {a.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Markdown renderer for assistant messages                            */
/* ------------------------------------------------------------------ */

function MarkdownMessage({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed text-[13.5px] text-white/85">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-white/95">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-white/70">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 space-y-1 pl-4 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 space-y-1 pl-4 list-decimal last:mb-0">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-[13px] text-white/80">
            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-primary/50" />
            <span>{children}</span>
          </li>
        ),
        h1: ({ children }) => (
          <h1 className="mb-2 text-[15px] font-semibold text-white/90">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-1.5 text-[13.5px] font-semibold text-white/85">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-1 text-[13px] font-medium text-white/80">{children}</h3>
        ),
        code: ({ children }) => (
          <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[12px] font-mono text-primary/80">{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/30 pl-3 italic text-white/60">{children}</blockquote>
        ),
        hr: () => <hr className="my-2 border-white/10" />,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

/* ------------------------------------------------------------------ */
/* Main Transcript                                                     */
/* ------------------------------------------------------------------ */

export function Transcript({ onQuickAction }: { onQuickAction?: (cmd: string) => void }) {
  const messages = useQuery(api.messages.list) ?? [];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col">
      {/* Quick action pills */}
      {onQuickAction && (
        <QuickActions onAction={onQuickAction} />
      )}

      {/* Message canvas */}
      <div
        ref={scrollRef}
        className="scroll-thin flex-1 min-h-0 w-full space-y-4 overflow-y-auto pb-4 pr-1 [mask-image:linear-gradient(to_bottom,transparent_0px,black_32px,black_90%,transparent)]"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 gap-3 text-center">
            <div className="h-10 w-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary/40" />
            </div>
            <p className="text-[13px] text-white/25">
              Ask Jarvis anything, or pick a quick action above.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" ? (
                /* ── Jarvis canvas bubble ── */
                <div className="group relative w-full max-w-[92%] rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.03] px-5 py-4 shadow-[0_2px_24px_rgba(0,0,0,0.3)]">
                  {/* Subtle left accent */}
                  <div className="absolute left-0 top-4 bottom-4 w-[2px] rounded-full bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

                  {/* Header */}
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="label-xs !text-[9px] text-primary/40 tracking-[0.2em]">JARVIS</span>
                    {m.status === "streaming" && (
                      <span className="flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-primary/60 animate-pulse" />
                        <span className="h-1 w-1 rounded-full bg-primary/40 animate-pulse [animation-delay:0.2s]" />
                        <span className="h-1 w-1 rounded-full bg-primary/20 animate-pulse [animation-delay:0.4s]" />
                      </span>
                    )}
                    {m.status === "interrupted" && (
                      <span className="mono text-[9px] text-white/25">interrupted</span>
                    )}
                  </div>

                  {/* Rendered markdown */}
                  <div className="prose-jarvis">
                    <MarkdownMessage text={m.text} />
                  </div>
                </div>
              ) : (
                /* ── User bubble ── */
                <div className="max-w-[72%] rounded-2xl rounded-br-sm border border-white/[0.08] bg-white/[0.055] px-4 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Send className="h-2.5 w-2.5 text-white/25" />
                    <span className="label-xs !text-[9px] text-white/25">YOU</span>
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-white/85">{m.text}</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
