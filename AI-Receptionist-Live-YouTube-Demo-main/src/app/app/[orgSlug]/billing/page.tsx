import { auth } from "@clerk/nextjs/server";

import { BillingScreen } from "@/components/dashboard/billing-screen";

export default async function BillingPage() {
  await auth.protect();

  return <BillingScreen />;
}
