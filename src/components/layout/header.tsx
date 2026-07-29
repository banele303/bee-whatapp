"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Menu, Settings as SettingsIcon, User } from "lucide-react";
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
import { ModeToggle } from "@/components/layout/mode-toggle";

const pageTitles: Record<string, string> = {
  "/dashboard": "dashboard",
  "/inbox": "inbox",
  "/notifications": "notifications",
  "/contacts": "contacts",
  "/pipelines": "pipelines",
  "/broadcasts": "broadcasts",
  "/automations": "automations",
  "/settings": "settings",
};

function getPageTitleKey(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path),
  );
  return match ? match[1] : "dashboard";
}

interface HeaderProps {
  /** Wired to the shell's drawer state. Used only on mobile — the
   *  hamburger button is hidden on lg+. */
  onOpenSidebar?: () => void;
}

import { useTranslations } from "next-intl";

import { Search, HelpCircle, ExternalLink, MessageSquare } from "lucide-react";

export function Header({ onOpenSidebar }: HeaderProps) {
  const t = useTranslations("Header");
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const titleKey = getPageTitleKey(pathname);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  const pathParts = pathname.split('/').filter(Boolean);
  const breadcrumb = pathParts.length > 0
    ? pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ')
    : 'Overview / Quickstart';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 backdrop-blur-md px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label={t("openMenu")}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        {/* Breadcrumb matching reference image */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{breadcrumb}</span>
        </div>
      </div>

      {/* Center/Right Section matching reference image */}
      <div className="flex items-center gap-2.5">
        {/* Search bar matching reference screenshot */}
        <div className="relative hidden md:flex items-center">
          <div className="absolute left-2.5 text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            placeholder="Search or ask AI..."
            className="h-8 w-60 rounded-md border border-border bg-muted/30 pl-8 pr-12 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <kbd className="absolute right-2 pointer-events-none rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            Ctrl K
          </kbd>
        </div>

        {/* Action Buttons matching reference image */}
        <a
          href="https://discord.com"
          target="_blank"
          rel="noreferrer"
          className="hidden lg:flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Get help on Discord</span>
        </a>

        <a
          href="https://docs.wacrm.io"
          target="_blank"
          rel="noreferrer"
          className="hidden lg:flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Documentation</span>
        </a>

        <button className="hidden sm:flex items-center rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          Feedback
        </button>

        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none data-popup-open:bg-muted/70"
            aria-label={t("openAccountMenu")}
          >
            <Avatar className="size-7">
              {profile?.avatar_url ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.full_name ?? t("defaultAvatar")}
                />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="min-w-56 bg-popover text-popover-foreground ring-border"
          >
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium text-foreground">
                {profile?.full_name ?? t("defaultUser")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.email ?? ""}
              </p>
            </div>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              render={
                <Link
                  href="/settings?tab=profile"
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
                  className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                />
              }
            >
              <SettingsIcon className="size-4" />
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
    </header>
  );
}
