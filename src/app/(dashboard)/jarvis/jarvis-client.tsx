"use client";

import { JarvisConvexProvider } from "@/components/jarvis/ConvexProvider";
import { AuthGate } from "@/components/jarvis/AuthGate";
import "./jarvis.css";

export function JarvisPageClient() {
  return (
    <JarvisConvexProvider>
      <div className="jarvis-scope">
        <AuthGate />
      </div>
    </JarvisConvexProvider>
  );
}
