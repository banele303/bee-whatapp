import { auth } from "@clerk/nextjs/server";

import { PublicSiteScreen } from "@/components/dashboard/public-site-screen";

export default async function PublicSitePage() {
  await auth.protect();

  return <PublicSiteScreen />;
}
