import { auth } from "@clerk/nextjs/server";

import { OfferingsScreen } from "@/components/dashboard/offerings-screen";

export default async function OfferingsPage() {
  await auth.protect();

  return <OfferingsScreen />;
}
