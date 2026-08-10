"use client";

import { JarvisConvexProvider } from "@/components/jarvis/ConvexProvider";
import { ProfileGate } from "@/components/jarvis/profile/ProfileGate";
import "../jarvis.css";

export function JarvisProfileClient() {
  return (
    <JarvisConvexProvider>
      <div className="jarvis-scope">
        <ProfileGate />
      </div>
    </JarvisConvexProvider>
  );
}
