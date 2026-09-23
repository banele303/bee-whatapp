"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import {
  Bell,
  Bot,
  Crown,
  FileText,
  GitBranch,
  GripVertical,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Mic,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Settings,
  Shield,
  Sparkles,
  User,
  UserCog,
  Users,
  UsersRound,
  Workflow,
  Wrench,
  X,
  Car,
  Calculator,
  Calendar,
  RefreshCw,
  BarChart3,
  FileCheck,
  Zap,
  Activity,
  ClipboardList,
  Stethoscope,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { AccountRole } from "@/lib/auth/roles";

// Per-role chip metadata used in the sidebar's account strip + the
// Members tab roster. Keeping this near both consumers in a single
// place avoids drift between the two surfaces — when a designer
// wants to recolour "agent" rows, this is the one diff.
const ROLE_CHIP: Record<
  AccountRole,
  { icon: typeof Crown; labelKey: string; className: string }
> = {
  owner: {
    icon: Crown,
    labelKey: "roleOwner",
    // Amber: scarce, immutable, "the boss" — gets visual emphasis.
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  admin: {
    icon: Shield,
    labelKey: "roleAdmin",
    // Primary-tinted: significant but not as scarce as owner.
    className:
      "border-primary/40 bg-primary/10 text-primary",
  },
  agent: {
    icon: UserCog,
    labelKey: "roleAgent",
    // Neutral slate: the operational default.
    className:
      "border-border bg-muted text-foreground",
  },
  viewer: {
    icon: User,
    labelKey: "roleViewer",
    // Muted slate: read-only role; visually quieter than agent.
    className:
      "border-border bg-card text-muted-foreground",
  },
};
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  /**
   * When true, the nav row renders a small "Beta" chip after the label.
   * Purely informational — doesn't affect routing or access.
   */
  beta?: boolean;
}

const coreNavItems: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/contacts", labelKey: "contacts", icon: Users },
  { href: "/pipelines", labelKey: "pipelines", icon: GitBranch },
  { href: "/jarvis", labelKey: "jarvisAi", icon: Sparkles },
];

const whatsAppNavItems: NavItem[] = [
  { href: "/inbox", labelKey: "inbox", icon: MessageSquare },
  { href: "/broadcasts", labelKey: "broadcasts", icon: Radio },
  { href: "/automations", labelKey: "whatsappAutomations", icon: Zap },
  { href: "/agents", labelKey: "aiAgents", icon: Bot },
  { href: "/flows", labelKey: "flows", icon: Workflow },
];

const healthcareNavItems: NavItem[] = [
  { href: "/session", labelKey: "Start Session & Notes", icon: Stethoscope },
  { href: "/health-notes", labelKey: "Clinical Notes", icon: ClipboardList },
  { href: "/appointments", labelKey: "Appointments", icon: Calendar },
  { href: "/health-analytics", labelKey: "Clinic Intelligence", icon: Activity },
  { href: "/specialist-directory", labelKey: "Specialists", icon: UsersRound },
];

const bottomNavItems = [
  { href: "/settings", labelKey: "settings", icon: Settings },
];

interface SidebarProps {
  /** Controlled on mobile by the Header's hamburger button. Ignored on lg+. */
  open?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  width?: number;
  onWidthChange?: (newWidth: number) => void;
}

import { useTranslations } from "next-intl";

export function Sidebar({
  open = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  width = 240,
  onWidthChange,
}: SidebarProps) {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const { profile, profileLoading, account, accountRole, signOut } = useAuth();
  const totalUnread = useTotalUnread();
  const unreadNotifications = useUnreadNotifications();
  const [isResizing, setIsResizing] = useState(false);

  const isWhatsAppRoute =
    pathname.startsWith("/inbox") ||
    pathname.startsWith("/broadcasts") ||
    pathname.startsWith("/automations") ||
    pathname.startsWith("/agents") ||
    pathname.startsWith("/flows");

  const isHealthcareRoute =
    pathname.startsWith("/session") ||
    pathname.startsWith("/transcribe") ||
    pathname.startsWith("/health-notes") ||
    pathname.startsWith("/health-analytics") ||
    pathname.startsWith("/specialist-directory") ||
    pathname.startsWith("/appointments");

  const [whatsappOpen, setWhatsappOpen] = useState(true);
  const [healthcareOpen, setHealthcareOpen] = useState(true);

  useEffect(() => {
    if (isWhatsAppRoute) setWhatsappOpen(true);
  }, [isWhatsAppRoute]);

  useEffect(() => {
    if (isHealthcareRoute) setHealthcareOpen(true);
  }, [isHealthcareRoute]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth >= 170 && newWidth <= 400) {
          onWidthChange?.(newWidth);
        }
      }
    },
    [isResizing, onWidthChange]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const currentWidth = isCollapsed ? 64 : width;

  const showAccountStrip =
    !profileLoading &&
    !!account?.name &&
    account.name !== profile?.full_name;

  // Close the drawer when route changes — users opened it to navigate,
  // so once they pick a destination the drawer should get out of the way.
  useEffect(() => {
    onClose?.();
    // Only pathname drives this — onClose identity doesn't need to re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll and allow Escape to close while the drawer is open on
  // mobile. No-ops on desktop because the sidebar isn't positioned there.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        role="presentation"
        aria-label={t("closeMenu")}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        style={{ width: `${currentWidth}px` }}
        className={cn(
          "relative fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-border bg-card transition-all duration-200 ease-out select-none",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-0 lg:translate-x-0"
        )}
        aria-label="Primary"
      >
        {/* Drag Handle for Resizing Width */}
        <div
          onMouseDown={startResizing}
          title="Drag to resize sidebar width"
          className={cn(
            "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 transition-colors z-50 group hidden lg:block",
            isResizing && "bg-primary"
          )}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-8 -mr-1 rounded bg-border opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>

        {/* Logo row with team switcher and Collapse Toggle */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs font-bold text-zinc-200 border border-zinc-700">
              BT
            </div>
            {!isCollapsed && (
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="text-xs font-semibold text-foreground truncate">
                  Blessed's team
                </span>
                <span className="rounded border border-zinc-800 bg-zinc-900 px-1 py-0.2 text-[9px] font-bold text-zinc-400">
                  FREE
                </span>
              </div>
            )}
          </Link>

          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("closeMenu")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Core Navigation (Dashboard, Contacts, Pipelines) */}
          <ul className="flex flex-col gap-1">
            {coreNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={isCollapsed ? (t(item.labelKey as string) === item.labelKey ? item.labelKey : t(item.labelKey as string)) : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && (
                      <span className="flex-1 truncate">{t(item.labelKey as string) === item.labelKey ? item.labelKey : t(item.labelKey as string)}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* 💬 WhatsApp Section (Collapsible) */}
          <div className="space-y-1">
            {isCollapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  title="WhatsApp"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition-colors relative mx-auto",
                    isWhatsAppRoute
                      ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <MessageSquare className="h-4 w-4" />
                  {totalUnread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-52 bg-card border-border p-1.5 shadow-xl">
                  <div className="px-2 py-1.5 text-xs font-bold text-foreground border-b border-border/60 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                    </span>
                    {totalUnread > 0 && (
                      <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {totalUnread}
                      </span>
                    )}
                  </div>
                  <div className="py-1">
                    {whatsAppNavItems.map((item) => {
                      const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                      return (
                        <DropdownMenuItem key={item.href} className="p-0">
                          <Link
                            href={item.href}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-2 py-1.5 text-xs rounded-md transition-colors cursor-pointer",
                              isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            <span className="flex-1">{t(item.labelKey as string) === item.labelKey ? item.labelKey : t(item.labelKey as string)}</span>
                            {item.href === "/inbox" && totalUnread > 0 && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            )}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setWhatsappOpen((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left group",
                    isWhatsAppRoute
                      ? "text-emerald-400 bg-emerald-500/10 font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded transition-colors",
                    isWhatsAppRoute ? "text-emerald-400" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="flex-1 truncate font-medium">WhatsApp</span>
                  {totalUnread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shadow-sm">
                      {totalUnread > 9 ? "9+" : totalUnread}
                    </span>
                  )}
                  {whatsappOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                  )}
                </button>

                {whatsappOpen && (
                  <ul className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border/60 pl-2">
                    {whatsAppNavItems.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));
                      const showUnreadDot =
                        item.href === "/inbox" && totalUnread > 0 && !isActive;

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 truncate">
                              {t(item.labelKey as string) === item.labelKey ? item.labelKey : t(item.labelKey as string)}
                            </span>
                            {showUnreadDot && (
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* 🏥 Healthcare AI Section (Collapsible) */}
          <div className="space-y-1">
            {isCollapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  title="Healthcare AI"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition-colors relative mx-auto",
                    isHealthcareRoute
                      ? "bg-indigo-500/15 text-indigo-400 font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Stethoscope className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-52 bg-card border-border p-1.5 shadow-xl">
                  <div className="px-2 py-1.5 text-xs font-bold text-foreground border-b border-border/60 flex items-center gap-1.5 text-indigo-400">
                    <Stethoscope className="h-3.5 w-3.5" /> Healthcare AI
                  </div>
                  <div className="py-1">
                    {healthcareNavItems.map((item) => {
                      const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                      return (
                        <DropdownMenuItem key={item.href} className="p-0">
                          <Link
                            href={item.href}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-2 py-1.5 text-xs rounded-md transition-colors cursor-pointer",
                              isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            <span className="flex-1">{item.labelKey}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setHealthcareOpen((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left group",
                    isHealthcareRoute
                      ? "text-indigo-400 bg-indigo-500/10 font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded transition-colors",
                    isHealthcareRoute ? "text-indigo-400" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <span className="flex-1 truncate font-medium">Healthcare AI</span>
                  {healthcareOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                  )}
                </button>

                {healthcareOpen && (
                  <ul className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border/60 pl-2">
                    {healthcareNavItems.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 truncate">{item.labelKey}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {!isCollapsed && (
            <>
              <div className="my-4 border-t border-border" />

              <ul className="flex flex-col gap-1">
                {bottomNavItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{t(item.labelKey as string)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </nav>

        {/* User section */}
        <div className="shrink-0 border-t border-border p-3">
          {/* Account name display — surfaced only when the account
              name differs from the user's own name (see
              `showAccountStrip`). For a default solo account the two
              match, so we hide it to avoid duplicating the user name
              below; for renamed or shared accounts it tells the user
              which account they're acting in. */}
          {showAccountStrip && account?.name ? (
            <div className="mb-2 flex items-center gap-2 px-3 text-xs text-muted-foreground">
              <UsersRound className="size-3.5 shrink-0" />
              {/* `title=` exposes the full name on hover when it
                  gets truncated (long account names + narrow
                  sidebars). Cheap a11y win. */}
              <span className="truncate" title={account.name}>
                {account.name}
              </span>
              {accountRole ? (
                // Always render the chip — owners used to be
                // invisible here, which made them indistinguishable
                // from admins at a glance. Now everyone sees their
                // role (with a colour cue) regardless of tier.
                (() => {
                  const meta = ROLE_CHIP[accountRole];
                  const Icon = meta.icon;
                  return (
                    <span
                      className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.className}`}
                    >
                      <Icon className="size-3" />
                      {t(meta.labelKey as string)}
                    </span>
                  );
                })()
              ) : null}
            </div>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none data-popup-open:bg-muted/60">
              <Avatar className="size-8 shrink-0">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? t("defaultAvatar")}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ??
                    profile?.email?.charAt(0)?.toUpperCase() ??
                    "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {profile?.full_name ?? t("defaultUser")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile?.email ?? ""}
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={6}
              className="min-w-56 bg-popover text-popover-foreground ring-border"
            >
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=profile"
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <User className="size-4" />
                {t("menuProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=whatsapp"
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <Settings className="size-4" />
                {t("menuSettings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <LogOut className="size-4" />
                {t("menuSignOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
