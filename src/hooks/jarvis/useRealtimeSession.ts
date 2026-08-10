import { useCallback, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { OrbState } from "@/lib/jarvis/types";

interface RealtimeSession {
  orbState: OrbState;
  active: boolean;
  connecting: boolean;
  error: string | null;
  activate: () => Promise<void>;
  deactivate: () => void;
  getLevel: () => number;
  /** Inject a system note (e.g. "Gmail connected") and have Jarvis respond. */
  notifySystem: (text: string) => void;
  /** Send a typed text command from the user over the session. */
  sendUserMessage: (text: string) => void;
}

export function useRealtimeSession(): RealtimeSession {
  const voiceState = useQuery(api.voiceState.get);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const setVoiceState = useMutation(api.voiceState.set);
  const finalizeMessage = useMutation(api.messages.finalize);
  const chatAgent = useAction(api.agent.chat);

  const active = voiceState?.sessionActive ?? false;
  const orbState = (active ? (voiceState?.orbState ?? "idle") : "idle") as OrbState;

  const activate = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      await setVoiceState({ orbState: "idle", sessionActive: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }, [setVoiceState]);

  const deactivate = useCallback(() => {
    void setVoiceState({ orbState: "idle", sessionActive: false }).catch(() => {});
  }, [setVoiceState]);

  const sendUserMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      
      const userItemId = "user_" + Math.random().toString(36).slice(2, 9);
      try {
        // 1. Immediately insert user's message as finalized so it appears in the chat transcript
        await finalizeMessage({
          itemId: userItemId,
          role: "user",
          text: text.trim(),
        });
        
        // 2. Run the agent chat in the background
        void chatAgent({ message: text.trim() }).catch((err) => {
          console.error("Agent chat failed:", err);
        });
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    },
    [finalizeMessage, chatAgent]
  );

  const notifySystem = useCallback(
    async (text: string) => {
      try {
        void chatAgent({ message: `[System note: ${text}]` }).catch(() => {});
      } catch (e) {
        // ignore
      }
    },
    [chatAgent]
  );

  const getLevel = useCallback((): number => {
    // Audio levels are always 0 because audio/voice is disabled
    return 0;
  }, []);

  return {
    orbState,
    active,
    connecting,
    error,
    activate,
    deactivate,
    getLevel,
    notifySystem,
    sendUserMessage,
  };
}
