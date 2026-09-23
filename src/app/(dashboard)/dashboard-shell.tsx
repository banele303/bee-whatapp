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

import { usePathname } from "next/navigation";
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
    const isDev = typeof document !== 'undefined' && document.cookie.includes('wacrm-dev-bypass=true');
    const hasSession = typeof document !== 'undefined' && (
      document.cookie.includes('sb-') ||
      document.cookie.includes('auth-token') ||
      isDev
    );
    if (isDev) return;
    if (!loading && !user && !hasSession) {
      router.push("/login");
    }
  }, [user, loading, router]);

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
        <main className={cn("flex-1 overflow-y-auto", (pathname === '/inbox' || pathname.startsWith('/jarvis')) ? "p-0 overflow-hidden" : "p-4 sm:p-6")}>{children}</main>
      </div>
    </div>
  );
}

import { JarvisConvexProvider } from "@/components/jarvis/ConvexProvider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <JarvisConvexProvider>
      <AuthProvider>
        <DashboardShellInner>{children}</DashboardShellInner>
      </AuthProvider>
    </JarvisConvexProvider>
  );
}
