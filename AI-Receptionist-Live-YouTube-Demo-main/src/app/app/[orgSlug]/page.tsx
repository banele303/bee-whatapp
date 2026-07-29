import { auth } from "@clerk/nextjs/server";

import { OverviewScreen } from "@/components/dashboard/overview-screen";

export default async function OverviewPage() {
  await auth.protect();

  return <OverviewScreen />;
}
