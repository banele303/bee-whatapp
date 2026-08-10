"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { useMemo } from "react";

export function JarvisConvexProvider({ children }: { children: React.ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const client = useMemo(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  if (!client) {
    return (
      <div className="relative z-10 flex h-full w-full items-center justify-center p-6 text-center">
        <div className="glass max-w-md rounded-2xl p-8 border-red-500/30">
          <h2 className="text-red-400 font-bold text-base mb-3">Convex URL Not Configured</h2>
          <p className="text-xs text-white/50 leading-relaxed mb-5">
            <code className="text-cyan-300">NEXT_PUBLIC_CONVEX_URL</code> was added to your <code className="text-cyan-300">.env.local</code> but Next.js has not picked it up yet. 
            Please restart your development server to load the new environment variables.
          </p>
          <div className="mono block bg-black/40 text-[10px] p-3 rounded text-cyan-300 select-all cursor-pointer">
            npm run dev
          </div>
        </div>
      </div>
    );
  }

  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
