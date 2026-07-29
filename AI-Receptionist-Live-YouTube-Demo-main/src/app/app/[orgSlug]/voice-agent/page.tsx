import { auth } from "@clerk/nextjs/server";

import { VoiceAgentScreen } from "@/components/dashboard/voice-agent-screen";

export default async function VoiceAgentPage() {
  await auth.protect();

  return <VoiceAgentScreen />;
}
