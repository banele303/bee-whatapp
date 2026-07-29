"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";
import { useQuery } from "convex/react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Clock3,
  Headphones,
  MessageSquareText,
  Mic,
  Radio,
  Square,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Orb, type AgentState } from "@/components/ui/orb";
import { dashboardApi } from "@/components/dashboard/data";
import {
  FeatureEntitlementCard,
  useFeatureEntitlements,
} from "@/components/dashboard/feature-gates";
import {
  EmptyState,
  formatDateTime,
  LoadingPanel,
  ScreenHeader,
  StatusBadge,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";

type AgentSessionResponse = {
  signedUrl: string;
  dynamicVariables: Record<string, string>;
};

function WebAgentSession() {
  const { terminology } = useWorkspace();
  const { startSession, endSession } = useConversationControls();
  const { status } = useConversationStatus();
  const [agentState, setAgentState] = useState<AgentState>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const connected = status === "connected";

  const stop = useCallback(async () => {
    await endSession();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setAgentState(null);
  }, [endSession]);

  const start = useCallback(async () => {
    setError(null);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const response = await fetch("/api/app/agent-session", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as
        | AgentSessionResponse
        | { error?: string };
      if (!response.ok || !("signedUrl" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The agent test could not be started.",
        );
      }
      await startSession({
        signedUrl: payload.signedUrl,
        dynamicVariables: payload.dynamicVariables,
        connectionType: "websocket",
        onModeChange: ({ mode }) =>
          setAgentState(mode === "speaking" ? "talking" : "listening"),
      });
      setAgentState("listening");
    } catch (caught) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setAgentState(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "Microphone access is required to start a web conversation.",
      );
    }
  }, [startSession]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-center">
      <div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-white/15 bg-white/5 text-white"
          >
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Web agent ready
          </Badge>
          {connected && (
            <Badge className="animate-pulse bg-primary text-primary-foreground hover:bg-primary/85">
              Live
            </Badge>
          )}
        </div>
        <h2 className="mt-5 max-w-lg font-heading text-3xl leading-none font-semibold tracking-[-0.035em]">
          Talk to the same agent your visitors meet.
        </h2>
        <p className="mt-3 max-w-lg text-xs leading-5 text-white/55">
          This live browser check uses the organization’s current ElevenLabs agent.
          Test the greeting, knowledge, and {terminology.booking.toLowerCase()} flow
          before sharing the public page.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {connected ? (
            <Button variant="destructive" onClick={() => void stop()}>
              <Square /> End test
            </Button>
          ) : (
            <Button
              onClick={() => void start()}
              disabled={status === "connecting"}
              className="bg-primary text-primary-foreground hover:bg-primary/85"
            >
              <Mic /> {status === "connecting" ? "Connecting…" : "Start voice test"}
            </Button>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11px] text-white/40">
            <Headphones className="size-3.5" /> Headphones recommended
          </span>
        </div>
        {error && <p className="mt-3 text-xs leading-5 text-rose-300">{error}</p>}
      </div>

      <div className="mx-auto size-52 max-w-full">
        <Orb
          agentState={agentState}
          colors={["#3156d9", "#9fb0ff"]}
          className="size-full"
        />
      </div>
    </div>
  );
}

function WebAgentConsole() {
  return (
    <ConversationProvider
      onError={(error) => console.error("Web agent session error", error)}
    >
      <WebAgentSession />
    </ConversationProvider>
  );
}

export function VoiceAgentScreen() {
  const { organization, orgSlug } = useWorkspace();
  const entitlements = useFeatureEntitlements();
  const agent = useQuery(
    dashboardApi.agents.getCurrent,
    organization ? {} : "skip",
  );
  const conversations = useQuery(
    dashboardApi.conversations.listRecent,
    organization ? { limit: 50 } : "skip",
  );

  return (
    <>
      <ScreenHeader
        eyebrow="AI channel control"
        title="AI Agent"
        description="Test text chat and browser audio, inspect recent conversations, and manage the public AI experience for this organization."
        action={
          <Button asChild variant="outline" className="bg-white">
            <Link href={`/app/${orgSlug}/public-site`}>
              Public experience <ArrowUpRight />
            </Link>
          </Button>
        }
      />

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <FeatureEntitlementCard feature="web_agent" />
        <FeatureEntitlementCard feature="browser_voice" />
      </div>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card className="bg-[#20201e] text-white ring-black/15">
          <CardContent className="pt-0">
            {!agent ? (
              <div className="grid min-h-80 place-items-center text-xs text-white/45">
                <div className="text-center">
                  <Activity className="mx-auto mb-3 size-5 animate-pulse text-primary" />
                  Loading agent configuration…
                </div>
              </div>
            ) : entitlements.browserVoice && agent.integration?.webEnabled ? (
              <WebAgentConsole />
            ) : (
              <div className="grid min-h-80 place-items-center px-5 py-10 text-center">
                <div className="max-w-md">
                  <span className="mx-auto grid size-12 place-items-center rounded-full border border-white/10 bg-white/5">
                    <Bot className="size-5 text-primary" />
                  </span>
                  <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
                    {agent.integration?.webEnabled
                      ? "Unlock browser conversations"
                      : "Agent setup in progress"}
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-white/50">
                    {agent.integration?.webEnabled
                      ? "Add browser audio to test the live microphone experience. Text chat can still run independently on the public page."
                      : "Connect an ElevenLabs agent to this organization before starting a live test."}
                  </p>
                  <Button asChild className="mt-5 bg-primary text-primary-foreground hover:bg-primary/85">
                    <Link
                      href={
                        agent.integration?.webEnabled
                          ? `/app/${orgSlug}/billing`
                          : `/app/${orgSlug}/settings`
                      }
                    >
                      {agent.integration?.webEnabled
                        ? "Compare plans"
                        : "Open settings"}
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-white">
            <CardHeader className="border-b border-black/8 pb-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Current agent
                </p>
                <CardTitle className="mt-1 font-heading text-xl tracking-tight">
                  Switchboard concierge
                </CardTitle>
              </div>
              <CardAction>
                <Radio className="size-4 text-primary" />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge
                  status={
                    agent?.integration?.webEnabled ? "active" : "draft"
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">Public modes</span>
                <span className="font-medium">Text + browser audio</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  First message
                </p>
                <CardTitle className="sr-only">Agent opening line</CardTitle>
              </div>
              <CardAction>
                <MessageSquareText className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <blockquote className="font-heading text-lg leading-7 tracking-tight text-foreground/80">
                “Hello, welcome to {organization?.name ?? "our team"}. How can I help today?”
              </blockquote>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="mt-6 bg-white">
        <CardHeader className="border-b border-black/8 pb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Conversation log
            </p>
            <CardTitle className="mt-1 font-heading text-xl tracking-tight">
              Recent conversations
            </CardTitle>
          </div>
          <CardAction>
            <Badge variant="outline" className="bg-white font-mono text-[10px]">
              Workspace records
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {!conversations ? (
            <LoadingPanel rows={4} />
          ) : conversations.length ? (
            <div className="divide-y divide-black/8">
              {conversations.map((conversation) => {
                const createdAt = conversation.startedAt;
                return (
                  <div
                    key={conversation._id}
                    className="grid gap-3 py-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-mono text-[11px] font-medium">
                        {formatDateTime(createdAt, organization?.timezone)}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[10px] tracking-wide text-muted-foreground uppercase">
                        <MessageSquareText className="size-3" />
                        Web
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {conversation.caller ?? "Unknown contact"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {conversation.summary ?? "Conversation captured; summary is still processing."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      {conversation.durationSeconds !== undefined && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                          <Clock3 className="size-3" />
                          {Math.max(1, Math.round(conversation.durationSeconds / 60))}m
                        </span>
                      )}
                      <StatusBadge status={conversation.status ?? "completed"} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              compact
              icon={MessageSquareText}
              title="No conversations yet"
              description="Test the web agent from this dashboard or the public page; summaries will appear here automatically."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
