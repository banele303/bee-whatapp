import { auth } from "@clerk/nextjs/server";

import { AvailabilityScreen } from "@/components/dashboard/availability-screen";

export default async function AvailabilityPage() {
  await auth.protect();

  return <AvailabilityScreen />;
}
