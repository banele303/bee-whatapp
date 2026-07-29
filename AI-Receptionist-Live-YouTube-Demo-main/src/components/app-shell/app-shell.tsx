"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Bot,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  LayoutDashboard,
  PanelsTopLeft,
  Settings2,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  dashboardApi,
  type Terminology,
} from "@/components/dashboard/data";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/components/dashboard/workspace-context";

type NavItem = {
  label: string;
  segment: string;
  icon: typeof LayoutDashboard;
};

function navigationFor(
  terminology: Terminology,
): Array<{ label: string; items: NavItem[] }> {
  return [
    {
      label: "Operate",
      items: [
        { label: "Overview", segment: "", icon: LayoutDashboard },
        {
          label: terminology.bookingPlural,
          segment: "bookings",
          icon: CalendarDays,
        },
        {
          label: terminology.offeringPlural,
          segment: "offerings",
          icon: CircleDollarSign,
        },
        {
          label: terminology.teamMemberPlural,
          segment: "team",
          icon: UsersRound,
        },
        { label: "Availability", segment: "availability", icon: Clock3 },
      ],
    },
    {
      label: "Experience",
      items: [
        { label: "AI Agent", segment: "voice-agent", icon: Bot },
        { label: "Public Site", segment: "public-site", icon: PanelsTopLeft },
      ],
    },
    {
      label: "Workspace",
      items: [
        { label: "Billing", segment: "billing", icon: CreditCard },
        { label: "Settings", segment: "settings", icon: Settings2 },
      ],
    },
  ];
}

function WorkspaceNavigation({
  navigation,
  orgSlug,
}: {
  navigation: Array<{ label: string; items: NavItem[] }>;
  orgSlug: string;
}) {
  const pathname = usePathname();

  return (
    <>
      {navigation.map((section) => (
        <SidebarGroup key={section.label} className="px-3 py-2">
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold tracking-[0.18em] text-sidebar-foreground/45 uppercase">
            {section.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {section.items.map((item) => {
                const href = item.segment
                  ? `/app/${orgSlug}/${item.segment}`
                  : `/app/${orgSlug}`;
                const isActive = item.segment
                  ? pathname === href || pathname.startsWith(`${href}/`)
                  : pathname === href;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.segment || "overview"}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "h-9 rounded-md px-2.5 text-[13px] transition-colors",
                        isActive &&
                          "bg-foreground text-background hover:bg-foreground hover:text-background",
                      )}
                    >
                      <Link href={href}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                        {item.segment === "voice-agent" && (
                          <span className="ml-auto size-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function ShellChrome({
  children,
  orgSlug,
}: {
  children: ReactNode;
  orgSlug: string;
}) {
  const pathname = usePathname();
  const { organization, isBootstrapping, terminology } = useWorkspace();
  const publicSite = useQuery(
    dashboardApi.publicSite.getCurrentDraft,
    organization ? {} : "skip",
  );
  const navigation = navigationFor(terminology);
  const routeLabels = Object.fromEntries(
    navigation.flatMap((section) =>
      section.items.map((item) => [item.segment, item.label]),
    ),
  );
  const segment = pathname.split("/").filter(Boolean)[2] ?? "";
  const pageLabel = routeLabels[segment] ?? "Overview";
  const organizationName = organization?.name ?? "Your organization";

  return (
    <SidebarProvider
      defaultOpen
      style={{ "--sidebar-width": "17.25rem" } as CSSProperties}
    >
      <Sidebar
        collapsible="offcanvas"
        className="border-r border-black/10 bg-[#f2f0e9]"
      >
        <SidebarHeader className="gap-4 px-4 pt-4 pb-3">
          <Link
            href={`/app/${orgSlug}`}
            className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-[0_2px_0_rgba(0,0,0,0.16)] transition-transform group-hover:-rotate-2">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-heading text-[17px] leading-none font-semibold tracking-[-0.02em]">
                Switchboard
              </span>
              <span className="mt-1 block text-[9px] font-semibold tracking-[0.18em] text-sidebar-foreground/45 uppercase">
                Operations desk
              </span>
            </span>
          </Link>

          <div className="rounded-lg border border-black/10 bg-white/70 px-2 py-1 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/app/:slug"
              afterSelectOrganizationUrl="/app/:slug"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  organizationSwitcherTrigger:
                    "w-full justify-between border-0 bg-transparent px-1 py-1 shadow-none",
                  organizationPreviewMainIdentifier:
                    "text-xs font-medium text-foreground",
                  organizationPreviewSecondaryIdentifier:
                    "text-[10px] text-muted-foreground",
                },
              }}
            />
          </div>
        </SidebarHeader>

        <Separator className="bg-black/10" />
        <SidebarContent className="py-2">
          <WorkspaceNavigation navigation={navigation} orgSlug={orgSlug} />
        </SidebarContent>

        <SidebarFooter className="p-3">
          <div className="rounded-lg border border-black/10 bg-white/55 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-sidebar-foreground/50 uppercase">
                Live workspace
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Synced
              </span>
            </div>
            <p className="mt-2 truncate text-xs font-medium">
              {isBootstrapping ? "Preparing workspace…" : organizationName}
            </p>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#faf9f5]">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-black/10 bg-[#faf9f5]/95 px-4 supports-[backdrop-filter]:bg-[#faf9f5]/85 supports-[backdrop-filter]:backdrop-blur-md sm:px-6">
          <SidebarTrigger className="mr-3 md:hidden" />

          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <span className="hidden truncate text-muted-foreground sm:inline">
              {organizationName}
            </span>
            <ChevronRight className="hidden size-3.5 text-muted-foreground/45 sm:block" />
            <span className="truncate font-medium">{pageLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="hidden border-black/10 bg-white px-2 text-[10px] font-semibold tracking-[0.12em] uppercase sm:inline-flex"
            >
              {organization?.timezone ?? "Timezone pending"}
            </Badge>
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link
                href={`/p/${publicSite?.site.siteSlug ?? orgSlug}`}
                target="_blank"
              >
                Open public page
              </Link>
            </Button>
            <UserButton
              appearance={{ elements: { avatarBox: "size-8 rounded-md" } }}
            />
          </div>
        </header>

        <main className="min-h-[calc(100svh-3.5rem)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppShell({
  children,
  orgSlug,
}: {
  children: ReactNode;
  orgSlug: string;
}) {
  return (
    <WorkspaceProvider orgSlug={orgSlug}>
      <ShellChrome orgSlug={orgSlug}>{children}</ShellChrome>
    </WorkspaceProvider>
  );
}
