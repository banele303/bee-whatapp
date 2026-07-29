"use client";

import type { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required.");
}

const convex = new ConvexReactClient(convexUrl);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <TooltipProvider delayDuration={250}>
          {children}
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </ConvexProviderWithClerk>
    </ThemeProvider>
  );
}
