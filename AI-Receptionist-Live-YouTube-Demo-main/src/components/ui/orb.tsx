"use client";

import type { CSSProperties, RefObject } from "react";
import { cn } from "@/lib/utils";

export type AgentState = null | "thinking" | "listening" | "talking";

type OrbProps = {
  colors?: [string, string];
  colorsRef?: RefObject<[string, string]>;
  resizeDebounce?: number;
  seed?: number;
  agentState?: AgentState;
  volumeMode?: "auto" | "manual";
  manualInput?: number;
  manualOutput?: number;
  inputVolumeRef?: RefObject<number>;
  outputVolumeRef?: RefObject<number>;
  getInputVolume?: () => number;
  getOutputVolume?: () => number;
  className?: string;
};

/**
 * A lightweight agent-state visual. It intentionally avoids WebGL so the
 * dashboard remains fast on low-power front-desk tablets and mobile devices.
 */
export function Orb({
  colors = ["#2446D8", "#9CB5FF"],
  agentState = null,
  className,
}: OrbProps) {
  const style = {
    "--orb-primary": colors[0],
    "--orb-secondary": colors[1],
  } as CSSProperties;

  return (
    <div
      className={cn("relative grid h-full w-full place-items-center", className)}
      style={style}
      role="img"
      aria-label={agentState ? `Agent is ${agentState}` : "Agent is ready"}
    >
      <span
        className={cn(
          "absolute size-[72%] rounded-full bg-[var(--orb-secondary)] opacity-20 blur-2xl motion-safe:animate-pulse",
          agentState === "talking" && "size-[88%] opacity-35",
        )}
      />
      <span
        className={cn(
          "absolute size-[58%] rounded-full border border-white/35 bg-[var(--orb-primary)] shadow-[inset_0_0_32px_rgba(255,255,255,0.24),0_18px_50px_rgba(20,35,92,0.28)] transition-all duration-500",
          agentState === "listening" && "scale-105",
          agentState === "thinking" && "motion-safe:animate-[spin_5s_linear_infinite]",
          agentState === "talking" && "scale-110",
        )}
      >
        <span className="absolute left-[18%] top-[16%] size-[28%] rounded-full bg-white/32 blur-md" />
        <span className="absolute bottom-[18%] right-[14%] size-[22%] rounded-full bg-[var(--orb-secondary)] opacity-65 blur-sm" />
      </span>
      {agentState === "talking" ? (
        <span className="absolute size-[67%] rounded-full border border-[var(--orb-secondary)] opacity-60 motion-safe:animate-ping" />
      ) : null}
      <span className="relative z-10 size-2 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,0.16)]" />
    </div>
  );
}
