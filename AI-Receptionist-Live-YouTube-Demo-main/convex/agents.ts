import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { requireCurrentOrganizationOperator } from "./lib/auth";

function hashClientKey(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

async function incrementRateWindow(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  publicSiteId: Id<"publicSites">,
  scopeKey: string,
  limit: number,
  windowStart: number,
  expiresAt: number,
) {
  const row = await ctx.db
    .query("agentSessionRateLimits")
    .withIndex("by_org_site_scope_window", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("publicSiteId", publicSiteId)
        .eq("scopeKey", scopeKey)
        .eq("windowStart", windowStart),
    )
    .unique();
  if (row && row.count >= limit) {
    throw new Error("Too many concierge sessions. Please wait a moment and try again.");
  }
  if (row) {
    await ctx.db.patch(row._id, { count: row.count + 1 });
  } else {
    await ctx.db.insert("agentSessionRateLimits", {
      organizationId,
      publicSiteId,
      scopeKey,
      windowStart,
      count: 1,
      expiresAt,
    });
  }
}

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const integration = await ctx.db
      .query("agentIntegrations")
      .withIndex("by_org_provider", (q) =>
        q.eq("organizationId", organization._id).eq("provider", "elevenlabs"),
      )
      .unique();
    return {
      provider: "elevenlabs" as const,
      integration: integration
        ? {
            _id: integration._id,
            webEnabled: integration.webEnabled,
            updatedAt: integration.updatedAt,
          }
        : null,
    };
  },
});

/**
 * Server-side gate for public signed-session creation. The Next route should
 * call this mutation (instead of the read-only publicSite helper) immediately
 * before requesting an ElevenLabs signed URL.
 */
export const requestPublicSession = mutation({
  args: {
    siteSlug: v.string(),
    clientKey: v.string(),
    mode: v.union(
      v.literal("text"),
      v.literal("voice"),
      v.literal("widget"),
    ),
  },
  handler: async (ctx, args) => {
    const siteSlug = args.siteSlug.trim().toLowerCase();
    const clientKey = args.clientKey.trim();
    if (!clientKey || clientKey.length > 200) {
      throw new Error("clientKey is required and must be 200 characters or fewer.");
    }
    const site = await ctx.db
      .query("publicSites")
      .withIndex("by_site_slug", (q) => q.eq("siteSlug", siteSlug))
      .unique();
    if (!site?.published || !site.publishedAt) {
      return null;
    }
    const modeEnabled =
      args.mode === "text"
        ? site.published.agent.showWebChat
        : args.mode === "voice"
          ? site.published.agent.showVoiceChat
          : site.published.agent.showElevenLabsWidget;
    if (!modeEnabled) {
      return null;
    }
    const organization = await ctx.db.get(site.organizationId);
    if (!organization) return null;
    const integration = await ctx.db
      .query("agentIntegrations")
      .withIndex("by_org_provider", (q) =>
        q.eq("organizationId", organization._id).eq("provider", "elevenlabs"),
      )
      .unique();
    if (!integration?.webEnabled) return null;

    const now = Date.now();
    const minuteWindowStart = Math.floor(now / 60_000) * 60_000;
    const dayWindowStart = Math.floor(now / 86_400_000) * 86_400_000;
    // Best-effort bounded cleanup prevents per-client windows from accumulating.
    const expired = await ctx.db
      .query("agentSessionRateLimits")
      .withIndex("by_org_expires", (q) =>
        q.eq("organizationId", organization._id).lt("expiresAt", now),
      )
      .take(20);
    for (const row of expired) await ctx.db.delete(row._id);

    await incrementRateWindow(
      ctx,
      organization._id,
      site._id,
      "site",
      60,
      minuteWindowStart,
      minuteWindowStart + 2 * 60_000,
    );
    await incrementRateWindow(
      ctx,
      organization._id,
      site._id,
      `client:${hashClientKey(clientKey)}`,
      8,
      minuteWindowStart,
      minuteWindowStart + 2 * 60_000,
    );
    await incrementRateWindow(
      ctx,
      organization._id,
      site._id,
      "site:daily",
      500,
      dayWindowStart,
      dayWindowStart + 2 * 86_400_000,
    );
    return {
      clerkOrgId: organization.clerkOrgId,
      siteSlug: site.siteSlug,
      mode: args.mode,
    };
  },
});
