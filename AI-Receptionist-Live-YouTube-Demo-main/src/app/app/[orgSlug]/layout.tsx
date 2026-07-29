import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth.protect();
  const { orgSlug: routeOrgSlug } = await params;

  if (!session.orgId || !session.orgSlug) {
    redirect("/app");
  }

  if (session.orgSlug !== routeOrgSlug) {
    redirect(`/app/${session.orgSlug}`);
  }

  const canOperate =
    session.has({ permission: "org:operations_hub:manage" }) ||
    session.has({ role: "org:admin" }) ||
    session.has({ role: "org:owner" });
  if (!canOperate) {
    redirect("/app/access-required");
  }

  return <AppShell orgSlug={routeOrgSlug}>{children}</AppShell>;
}
