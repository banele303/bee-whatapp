"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { useRealtimeSession } from "@/hooks/jarvis/useRealtimeSession";
import { ORB_STATE_HUES, OrbState } from "@/lib/jarvis/types";
import { JarvisOrb } from "./orb/JarvisOrb";
import { Transcript } from "./Transcript";
import { LeftPanel } from "./panels/LeftPanel";
import { RightPanel } from "./panels/RightPanel";

export function JarvisApp() {
  const session = useRealtimeSession();
  const seed = useMutation(api.init.seed);
  const syncConnections = useAction(api.composio.syncConnections);
  const checkConnection = useAction(api.composio.checkConnection);

  const voiceState = useQuery(api.voiceState.get);
  const connections = useQuery(api.connections.list) ?? [];

  // Bootstrap singletons + refresh connection statuses once per load.
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void seed({}).catch(() => {});
    void syncConnections({}).catch(() => {});
  }, [seed, syncConnections]);

  // Re-evaluate staleness periodically so dead sessions stop mirroring.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const [chatInput, setChatInput] = useState("");
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !session.active) return;
    session.sendUserMessage(chatInput.trim());
    setChatInput("");
  };

  // This tab hosts the live session, or mirrors another tab's session.
  // A mirror only trusts sessionActive if the host heartbeat is fresh.
  const heartbeatFresh =
    !!voiceState?.sessionActive && Date.now() - voiceState.updatedAt < 25000;
  const mirroring = !session.active && heartbeatFresh;
  const displayState: OrbState = session.active
    ? session.orbState
    : mirroring
      ? ((voiceState?.orbState ?? "idle") as OrbState)
      : "idle";
  const sessionAlive = session.active || mirroring;

  // Ambient scene tint follows the orb state.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--state-hue",
      String(ORB_STATE_HUES[displayState] ?? 197)
    );
  }, [displayState]);

  // Poll pending OAuth connections; the host tab notifies Jarvis on success.
  const pendingToolkits = useMemo(
    () =>
      connections
        .filter((c) => c.status === "pending_auth")
        .map((c) => `${c.toolkit}:${c.name}`)
        .join(","),
    [connections]
  );
  useEffect(() => {
    if (!pendingToolkits) return;
    const entries = pendingToolkits.split(",").map((e) => {
      const [toolkit, name] = e.split(":");
      return { toolkit, name };
    });
    const interval = setInterval(() => {
      for (const { toolkit, name } of entries) {
        void checkConnection({ toolkit })
          .then((res) => {
            if (res?.connected && session.active) {
              session.notifySystem(
                `System note: ${name} has been connected successfully. Acknowledge this to the user briefly and offer a relevant next step.`
              );
            }
          })
          .catch(() => {});
      }
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingToolkits, session.active]);

  // Mirror tabs synthesize a plausible audio level so the orb still feels alive.
  const getLevel = () => {
    if (session.active) return session.getLevel();
    if (mirroring && (displayState === "speaking" || displayState === "listening")) {
      const t = performance.now() / 1000;
      return 0.25 + 0.2 * Math.sin(t * 6.1) + 0.12 * Math.sin(t * 13.7);
    }
    return 0;
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="relative z-10 flex h-full flex-col">
        <Header sessionAlive={sessionAlive} mirroring={mirroring} error={session.error} />

        <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr_320px] gap-4 px-4 pb-4 xl:grid-cols-[330px_1fr_360px] xl:gap-5 xl:px-5 xl:pb-5">
          <LeftPanel />

          <main className="glass flex min-h-0 flex-col items-center rounded-2xl px-6 pt-2">
            <JarvisOrb
              state={displayState}
              getLevel={getLevel}
              active={sessionAlive}
              onActivate={() => void session.activate()}
              onDeactivate={session.deactivate}
              hosting={session.active}
              connecting={session.connecting}
            />
            {mirroring && (
              <p className="mono -mt-2 text-[10px] tracking-[0.25em] text-white/30 uppercase">
                Session active in another window
              </p>
            )}
            <Transcript />
            
            {session.active && (
              <form onSubmit={handleSendChat} className="w-full mt-auto pb-4 pt-2 shrink-0">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a command (e.g., 'Check my unread emails')..."
                    className="mono w-full rounded-lg border border-white/10 bg-white/[0.04] pl-4 pr-16 py-2 text-[12px] text-white/80 outline-none transition focus:border-cyan-300/40 focus:bg-cyan-400/[0.04]"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="absolute right-2 px-2.5 py-1 rounded bg-cyan-400/10 text-cyan-300 text-[10px] tracking-[0.1em] border border-cyan-400/20 hover:bg-cyan-400/20 transition disabled:opacity-30 disabled:hover:bg-cyan-400/10"
                  >
                    SEND
                  </button>
                </div>
              </form>
            )}

            {!session.active && (
              <div className="w-full mt-auto pb-4 pt-2 text-center shrink-0">
                <button
                  onClick={() => void session.activate()}
                  disabled={session.connecting}
                  className="mono mx-auto rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-[11px] tracking-[0.2em] text-cyan-200 uppercase transition hover:bg-cyan-400/20 hover:shadow-[0_0_30px_rgba(69,216,255,0.15)] disabled:opacity-50"
                >
                  {session.connecting ? "Connecting..." : "Connect Jarvis to type commands"}
                </button>
              </div>
            )}
          </main>

          <RightPanel />
        </div>
      </div>
    </div>
  );
}

function Header({
  sessionAlive,
  mirroring,
  error,
}: {
  sessionAlive: boolean;
  mirroring: boolean;
  error: string | null;
}) {
  const { signOut } = useAuthActions();
  const user = useQuery(api.auth.me);
  const profile = useQuery(api.profiles.get);
  return (
    <header className="flex items-center justify-between px-6 py-4 xl:px-7">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[15px] font-semibold tracking-[0.42em] text-white/90">
          J A R V I S
        </h1>
        <span className="label-xs">Control Center</span>
      </div>
      <div className="flex items-center gap-4">
        {error && (
          <span className="mono max-w-[420px] truncate text-[11px] text-red-300/80">
            {error}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${sessionAlive ? "" : "opacity-30"}`}
            style={{
              background: sessionAlive ? "var(--state-color)" : "#7b8794",
              boxShadow: sessionAlive ? "0 0 10px var(--state-color)" : "none",
            }}
          />
          <span className="mono text-[10px] tracking-[0.25em] text-white/40 uppercase">
            {sessionAlive ? (mirroring ? "Linked" : "Online") : "Standby"}
          </span>
        </div>
        <Clock />
        <div className="flex items-center gap-2.5 border-l border-white/10 pl-4">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.05]">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] font-semibold text-cyan-200/70">
                  {(profile?.displayName ?? user?.email ?? "O")[0]?.toUpperCase()}
                </span>
              )}
            </span>
            <span className="mono max-w-[160px] truncate text-[11px] text-white/40">
              {profile?.displayName ?? user?.email ?? "operator"}
            </span>
          </span>
          <Link
            href="/jarvis/profile"
            className="mono rounded border border-cyan-300/20 bg-cyan-400/[0.06] px-2 py-1 text-[9.5px] tracking-[0.2em] text-cyan-200/70 uppercase transition hover:border-cyan-300/45 hover:bg-cyan-400/15 hover:text-cyan-100"
          >
            Edit profile
          </Link>
          <button
            onClick={() => void signOut()}
            className="mono rounded border border-white/10 px-2 py-1 text-[9.5px] tracking-[0.2em] text-white/35 uppercase transition hover:border-red-300/40 hover:text-red-300/80"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span suppressHydrationWarning className="mono text-[11px] text-white/35">
      {time}
    </span>
  );
}
