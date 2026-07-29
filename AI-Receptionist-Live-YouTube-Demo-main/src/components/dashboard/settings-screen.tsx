"use client";

import { OrganizationProfile } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Building2,
  Clock3,
  Globe2,
  Languages,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  LoadingPanel,
  ScreenHeader,
  SectionHeading,
} from "@/components/dashboard/screen-kit";
import { dashboardApi } from "@/components/dashboard/data";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { WorkspaceLanguageEditor } from "@/components/dashboard/workspace-language-editor";

export function SettingsScreen() {
  const { organization } = useWorkspace();
  const publicSite = useQuery(
    dashboardApi.publicSite.getCurrentDraft,
    organization ? {} : "skip",
  );

  return (
    <>
      <ScreenHeader
        eyebrow="Workspace administration"
        title="Settings"
        description="Configure organization identity, workspace language, members, and access for this tenant."
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(18rem,0.65fr)_minmax(0,1.35fr)]">
        <Card className="h-fit bg-white">
          <CardHeader className="border-b border-black/8 pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <CardTitle className="font-heading text-xl tracking-tight">
                Organization profile
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs text-muted-foreground">Name</span>
              <span className="text-right text-xs font-medium">
                {organization?.name ?? "—"}
              </span>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" /> Timezone
              </span>
              <span className="max-w-44 text-right font-mono text-[10px] font-medium">
                {organization?.timezone ?? "Not configured"}
              </span>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Languages className="size-3.5" /> Locale
              </span>
              <span className="font-mono text-[10px] font-medium">
                {organization?.locale ?? "—"} · {organization?.currency ?? "—"}
              </span>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe2 className="size-3.5" /> Public slug
              </span>
              <span className="font-mono text-[10px] font-medium">
                /p/{publicSite?.site.siteSlug ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {organization ? (
          <WorkspaceLanguageEditor
            key={organization._id}
            organization={organization}
          />
        ) : (
          <LoadingPanel rows={6} />
        )}
      </section>

      <section className="mt-8 space-y-4">
        <SectionHeading
          title="Members & access"
          description="Manage Clerk organization details, members, roles, and invitations."
        />
        <div className="min-w-0 overflow-hidden rounded-xl border border-black/10 bg-white p-2 sm:p-4">
          <OrganizationProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none",
                card: "w-full shadow-none border-0",
                navbar: "border-r border-black/10",
                navbarButton: "text-foreground",
                pageScrollBox: "p-0",
              },
            }}
          />
        </div>
      </section>
    </>
  );
}
