import { cache } from "react";
import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";

import { api } from "../../../../convex/_generated/api";
import { PublicSite } from "@/components/public-site/public-site";
import { PublicSiteUnavailable } from "@/components/public-site/public-site-states";
import { organizationHasFeature } from "@/lib/clerk-billing";

const getPublishedSite = cache((siteSlug: string) =>
  fetchQuery(api.publicSite.getPublishedBySlug, { siteSlug }),
);

const getAgentSessionConfig = cache((siteSlug: string) =>
  fetchQuery(api.publicSite.getAgentSessionConfig, { siteSlug }),
);

const getAgentFeatures = cache(async (clerkOrgId: string) => {
  const [text, voice] = await Promise.all([
    organizationHasFeature(clerkOrgId, "web_agent"),
    organizationHasFeature(clerkOrgId, "browser_voice"),
  ]);

  return { text, voice };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}): Promise<Metadata> {
  const { siteSlug } = await params;
  const publishedSite = await getPublishedSite(siteSlug);

  if (!publishedSite) {
    return {
      title: "Page unavailable",
      robots: { index: false, follow: false },
    };
  }

  const { config } = publishedSite.site;
  const title = `${config.businessName} · Book online`;

  return {
    title,
    description: config.subheadline || config.about,
    openGraph: {
      title,
      description: config.subheadline || config.about,
      images: config.heroImageUrl ? [config.heroImageUrl] : undefined,
    },
  };
}

export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const [publishedSite, agentSessionConfig] = await Promise.all([
    getPublishedSite(siteSlug),
    getAgentSessionConfig(siteSlug),
  ]);

  if (!publishedSite) {
    return <PublicSiteUnavailable />;
  }

  const agentFeatures = agentSessionConfig
    ? await getAgentFeatures(agentSessionConfig.clerkOrgId)
    : { text: false, voice: false };

  return (
    <PublicSite
      siteSlug={siteSlug}
      publishedSite={publishedSite}
      textAgentEnabled={agentFeatures.text}
      voiceAgentEnabled={agentFeatures.voice}
    />
  );
}
