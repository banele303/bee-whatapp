import { auth } from "@clerk/nextjs/server";

import { TeamScreen } from "@/components/dashboard/team-screen";

export default async function TeamPage() {
  await auth.protect();

  return <TeamScreen />;
}
