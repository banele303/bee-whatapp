"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PresenceHeartbeat } from "@/components/presence/presence-heartbeat";

// Auth-gated dashboard shell. Extracted from the layout so the layout
// itself can stay a server component and export metadata (noindex) —
// client components can't export Next's metadata object.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Sparkles, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleCollapse = useCallback(() => setIsCollapsed(prev => !prev), []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // GoHighLevel Tool Mode: Hide main navbar & sidebar on specialized tools (Copilot & Canvas Editor)
  const isToolPage = pathname.startsWith('/automations/copilot') || (pathname.startsWith('/automations/workflows/') && pathname !== '/automations/workflows');

  if (isToolPage) {
    const isCopilot = pathname.startsWith('/automations/copilot');
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <PresenceHeartbeat />
        {/* GoHighLevel-style Tool Focus Header Bar */}
        <div className="h-12 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group px-2 py-1 rounded-md hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to WACRM</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              {isCopilot ? (
                <>
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-foreground">Sourcing AI Copilot</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px]">DeepSeek v3</Badge>
                </>
              ) : (
                <>
                  <Workflow className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Visual Automation Builder</span>
                  <Badge className="bg-primary/10 text-primary border-primary/30 text-[9px]">Studio Mode</Badge>
                </>
              )}
            </div>
          </div>
        </div>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PresenceHeartbeat />
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <main className={cn("flex-1 overflow-y-auto", pathname === '/inbox' ? "p-0 overflow-hidden" : "p-4 sm:p-6")}>{children}</main>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </AuthProvider>
  );
}
