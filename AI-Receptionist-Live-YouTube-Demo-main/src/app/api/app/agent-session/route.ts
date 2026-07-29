import { auth } from "@clerk/nextjs/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";

import { api } from "../../../../../convex/_generated/api";
import { createAgentDynamicVariables } from "@/lib/agent-context";

export const runtime = "nodejs";

export async function POST() {
  const { getToken, has, isAuthenticated, orgId } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!has({ feature: "browser_voice" })) {
    return NextResponse.json(
      { error: "This organization’s plan does not include browser audio." },
      { status: 403 },
    );
  }
  if (
    !has({ permission: "org:operations_hub:manage" }) &&
    !has({ role: "org:admin" }) &&
    !has({ role: "org:owner" })
  ) {
    return NextResponse.json(
      { error: "Organization operator access is required." },
      { status: 403 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_DEFAULT_AGENT_ID?.trim();
  const token = await getToken();
  if (!apiKey || !agentId || !token) {
    return NextResponse.json(
      { error: "The agent test is not configured." },
      { status: 503 },
    );
  }

  try {
    const options = { token };
    const [organization, agent, site, offerings, knowledgeItems] =
      await Promise.all([
        fetchQuery(api.organizations.current, {}, options),
        fetchQuery(api.agents.getCurrent, {}, options),
        fetchQuery(api.publicSite.getCurrentDraft, {}, options),
        fetchQuery(api.catalog.listOfferings, { includeInactive: false }, options),
        fetchQuery(api.knowledge.list, { includeUnpublished: false }, options),
      ]);

    if (
      !organization ||
      organization.clerkOrgId !== orgId ||
      !agent.integration?.webEnabled
    ) {
      return NextResponse.json(
        { error: "No web agent is connected to this organization." },
        { status: 404 },
      );
    }

    const elevenlabs = new ElevenLabsClient({ apiKey });
    const { signedUrl } =
      await elevenlabs.conversationalAi.conversations.getSignedUrl({
        agentId,
      });

    return NextResponse.json(
      {
        signedUrl,
        dynamicVariables: createAgentDynamicVariables({
          siteSlug: site.site.siteSlug,
          businessName: site.site.draft.businessName,
          description: site.site.draft.about,
          timezone: organization.timezone,
          locale: organization.locale,
          currency: organization.currency,
          terminology: organization.terminology,
          offerings,
          knowledgeItems,
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unable to start authenticated ElevenLabs agent test", error);
    return NextResponse.json(
      { error: "The agent test is unavailable right now." },
      { status: 500 },
    );
  }
}
