"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useConvex } from "convex/react";

import {
  createAgentClientTools,
  type AgentClientTools,
} from "@/components/public-site/agent-tools";
import type {
  PublicOffering,
  PublicTeamMember,
} from "@/components/public-site/types";

type DynamicValue = string | number | boolean;

type WidgetSession = {
  signedUrl: string;
  dynamicVariables: Record<string, DynamicValue>;
  mintedAt: number;
};

type CallEventDetail = {
  config?: {
    signedUrl?: string;
    clientTools?: Partial<AgentClientTools>;
  };
};

const REFRESH_AFTER_MS = 10 * 60 * 1_000;
const REFRESH_CHECK_MS = 30 * 1_000;

function isDynamicVariables(
  value: unknown,
): value is Record<string, DynamicValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every(
    (entry) =>
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean",
  );
}

function isSignedUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "wss:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function ElevenLabsEmbed({
  siteSlug,
  businessName,
  primaryColor,
  secondaryColor,
  offerings,
  teamMembers,
  timezone,
  locale,
}: {
  siteSlug: string;
  businessName: string;
  primaryColor: string;
  secondaryColor: string;
  offerings: PublicOffering[];
  teamMembers: PublicTeamMember[];
  timezone: string;
  locale: string;
}) {
  const convex = useConvex();
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [session, setSession] = useState<WidgetSession | null>(null);
  const sessionRef = useRef<WidgetSession | null>(null);
  const widgetRef = useRef<HTMLElement | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(false);
  const clientTools = useMemo(
    () =>
      createAgentClientTools({
        convex,
        siteSlug,
        businessName,
        offerings,
        teamMembers,
        timezone,
        locale,
      }),
    [
      businessName,
      convex,
      locale,
      offerings,
      siteSlug,
      teamMembers,
      timezone,
    ],
  );
  const setWidgetRef = useCallback((element: HTMLElement | null) => {
    widgetRef.current = element;
  }, []);

  const refreshSession = useCallback(() => {
    if (requestRef.current) return requestRef.current;

    const request = (async () => {
      try {
        const response = await fetch(
          `/api/public/${encodeURIComponent(siteSlug)}/agent-session`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "widget" }),
            cache: "no-store",
          },
        );
        const payload = (await response.json().catch(() => null)) as {
          signedUrl?: unknown;
          dynamicVariables?: unknown;
        } | null;

        if (
          !response.ok ||
          !payload ||
          !isSignedUrl(payload.signedUrl) ||
          !isDynamicVariables(payload.dynamicVariables)
        ) {
          throw new Error("The widget session is unavailable.");
        }

        const nextSession = {
          signedUrl: payload.signedUrl,
          dynamicVariables: payload.dynamicVariables,
          mintedAt: Date.now(),
        } satisfies WidgetSession;

        sessionRef.current = nextSession;
        if (mountedRef.current) setSession(nextSession);
      } catch {
        console.error("Unable to refresh the ElevenLabs embed session.");
      }
    })();

    requestRef.current = request;
    void request.finally(() => {
      if (requestRef.current === request) requestRef.current = null;
    });
    return request;
  }, [siteSlug]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void import("@elevenlabs/convai-widget-embed")
      .then(() => {
        if (active) setEmbedLoaded(true);
      })
      .catch(() => {
        console.error("Unable to load the ElevenLabs embed.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const refreshIfStale = () => {
      const current = sessionRef.current;
      if (!current || Date.now() - current.mintedAt >= REFRESH_AFTER_MS) {
        void refreshSession();
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshIfStale();
    };

    const interval = window.setInterval(refreshIfStale, REFRESH_CHECK_MS);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refreshIfStale);
    window.addEventListener("online", refreshIfStale);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", refreshIfStale);
      window.removeEventListener("online", refreshIfStale);
    };
  }, [refreshSession]);

  useEffect(() => {
    const handleCall = (event: Event) => {
      const widget = widgetRef.current;
      if (!widget || !event.composedPath().includes(widget)) return;

      const current = sessionRef.current;
      const detail = (event as CustomEvent<CallEventDetail>).detail;
      if (current && detail?.config) {
        detail.config.signedUrl = current.signedUrl;
        detail.config.clientTools = {
          ...detail.config.clientTools,
          ...clientTools,
        };
      }
      void refreshSession();
    };

    document.addEventListener("elevenlabs-convai:call", handleCall);
    return () => {
      document.removeEventListener("elevenlabs-convai:call", handleCall);
    };
  }, [clientTools, refreshSession]);

  if (!embedLoaded || !session) return null;

  return (
    <elevenlabs-convai
      ref={setWidgetRef}
      signed-url={session.signedUrl}
      dynamic-variables={JSON.stringify(session.dynamicVariables)}
      variant="compact"
      placement="bottom-right"
      dismissible="true"
      text-input="true"
      avatar-orb-color-1={primaryColor}
      avatar-orb-color-2={secondaryColor}
      aria-label={`${businessName} AI concierge`}
      style={{ zIndex: 50 }}
    />
  );
}
