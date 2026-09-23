"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OrbState } from "@/lib/jarvis/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: "streaming" | "final" | "interrupted";
}

export interface RealtimeSession {
  orbState: OrbState;
  active: boolean;
  connecting: boolean;
  error: string | null;
  messages: ChatMessage[];
  activate: () => Promise<void>;
  deactivate: () => void;
  getLevel: () => number;
  notifySystem: (text: string) => void;
  sendUserMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

const STORAGE_KEY = "jarvis_chat_messages_v1";

export function useRealtimeSession(): RealtimeSession {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [active, setActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Hydrate messages from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch {
      // ignore parsing errors
    }
  }, []);

  // Save messages to localStorage on change
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
      }
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  const activate = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      // Short delay to give a smooth activation feel
      await new Promise((r) => setTimeout(r, 250));
      setActive(true);
      setOrbState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }, []);

  const deactivate = useCallback(() => {
    setActive(false);
    setOrbState("idle");
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const sendUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = {
        id: "msg_user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        role: "user",
        text: trimmed,
        status: "final",
      };

      const currentHistory = [...messages, userMsg];
      setMessages(currentHistory);
      setOrbState("thinking");
      setError(null);

      try {
        const res = await fetch("/api/jarvis/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: messages.slice(-10).map((m) => ({ role: m.role, content: m.text })),
          }),
        });

        if (!res.ok) {
          throw new Error(`Jarvis server responded with status ${res.status}`);
        }

        const data = await res.json();
        const assistantText = data.content || "Standing by, sir.";

        setOrbState("speaking");

        const assistantMsg: ChatMessage = {
          id: "msg_asst_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
          role: "assistant",
          text: assistantText,
          status: "final",
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Speak for a couple seconds based on response length, then return to idle
        const speakingDurationMs = Math.min(Math.max(assistantText.length * 15, 1200), 4000);
        setTimeout(() => {
          setOrbState("idle");
        }, speakingDurationMs);
      } catch (err) {
        console.error("Jarvis chat error:", err);
        setOrbState("idle");
        const fallbackMsg: ChatMessage = {
          id: "msg_err_" + Date.now(),
          role: "assistant",
          text: "I encountered an issue processing that request. Standing by.",
          status: "final",
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      }
    },
    [messages]
  );

  const notifySystem = useCallback(
    (text: string) => {
      void sendUserMessage(`[System note: ${text}]`);
    },
    [sendUserMessage]
  );

  const orbStateRef = useRef(orbState);
  orbStateRef.current = orbState;
  const activeRef = useRef(active);
  activeRef.current = active;

  const getLevel = useCallback((): number => {
    if (!activeRef.current) return 0;
    if (orbStateRef.current === "speaking") {
      const t = performance.now() / 1000;
      return 0.28 + 0.22 * Math.sin(t * 6.5) + 0.12 * Math.sin(t * 14.1);
    }
    if (orbStateRef.current === "thinking") {
      const t = performance.now() / 1000;
      return 0.1 + 0.08 * Math.sin(t * 3.2);
    }
    return 0;
  }, []);

  return {
    orbState,
    active,
    connecting,
    error,
    messages,
    activate,
    deactivate,
    getLevel,
    notifySystem,
    sendUserMessage,
    clearMessages,
  };
}
