import { auth } from "@clerk/nextjs/server";

import { SettingsScreen } from "@/components/dashboard/settings-screen";

export default async function SettingsPage() {
  await auth.protect();

  return <SettingsScreen />;
}
