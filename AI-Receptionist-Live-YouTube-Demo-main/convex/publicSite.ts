import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentOrganizationOperator } from "./lib/auth";
import { slugify } from "./lib/defaults";
import { sanitizeSiteConfig, siteConfigValidator } from "./lib/siteConfig";
import { requiredTrimmed } from "./lib/validation";

export const getPublishedBySlug = query({
  args: { siteSlug: v.string() },
  handler: async (ctx, args) => {
    const site = await ctx.db
      .query("publicSites")
      .withIndex("by_site_slug", (q) => q.eq("siteSlug", args.siteSlug.trim().toLowerCase()))
      .unique();
    if (!site?.published || !site.publishedAt) return null;
    const organization = await ctx.db.get(site.organizationId);
    if (!organization) return null;

    const [offerings, teamMembers, knowledgeItems] = await Promise.all([
      ctx.db
        .query("offerings")
        .withIndex("by_org_active", (q) =>
          q.eq("organizationId", organization._id).eq("active", true),
        )
        .take(201),
      ctx.db
        .query("teamMembers")
        .withIndex("by_org_active", (q) =>
          q.eq("organizationId", organization._id).eq("active", true),
        )
        .take(201),
      ctx.db
        .query("knowledgeItems")
        .withIndex("by_org_published", (q) =>
          q.eq("organizationId", organization._id).eq("published", true),
        )
        .take(201),
    ]);
    if (offerings.length > 200 || teamMembers.length > 200 || knowledgeItems.length > 200) {
      throw new Error("Published site content limit exceeded.");
    }
    return {
      site: {
        _id: site._id,
        siteSlug: site.siteSlug,
        config: site.published,
        publishedAt: site.publishedAt,
      },
      organization: {
        clerkOrgId: organization.clerkOrgId,
        name: organization.name,
        slug: organization.slug,
        timezone: organization.timezone,
        currency: organization.currency,
        locale: organization.locale,
        terminology: organization.terminology,
      },
      offerings: offerings
        .filter((offering) => offering.bookableOnline)
        .map((offering) => ({
          _id: offering._id,
          name: offering.name,
          slug: offering.slug,
          description: offering.description,
          category: offering.category,
          durationMinutes: offering.durationMinutes,
          priceMinor: offering.priceMinor,
          currency: offering.currency,
          active: offering.active,
        })),
      teamMembers: teamMembers
        .filter((member) => member.acceptingBookings)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((member) => ({
          _id: member._id,
          name: member.name,
          title: member.title,
          bio: member.bio,
          imageUrl: member.imageUrl,
          offeringIds: member.offeringIds,
          active: member.active,
        })),
      knowledgeItems: knowledgeItems
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          _id: item._id,
          title: item.title,
          content: item.content,
          category: item.category,
        })),
    };
  },
});

export const getAgentSessionConfig = query({
  args: { siteSlug: v.string() },
  handler: async (ctx, args) => {
    const siteSlug = args.siteSlug.trim().toLowerCase();
    const site = await ctx.db
      .query("publicSites")
      .withIndex("by_site_slug", (q) => q.eq("siteSlug", siteSlug))
      .unique();
    if (
      !site?.published ||
      !site.publishedAt ||
      (!site.published.agent.showWebChat &&
        !site.published.agent.showVoiceChat &&
        !site.published.agent.showElevenLabsWidget)
    ) {
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
    return {
      clerkOrgId: organization.clerkOrgId,
      siteSlug: site.siteSlug,
    };
  },
});

export const getCurrentDraft = query({
  args: {},
  handler: async (ctx) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const site = await ctx.db
      .query("publicSites")
      .withIndex("by_organization", (q) => q.eq("organizationId", organization._id))
      .unique();
    if (!site) throw new Error("Public site not initialized.");
    return {
      site: {
        _id: site._id,
        siteSlug: site.siteSlug,
        draft: site.draft,
        published: site.published,
        publishedAt: site.publishedAt,
        updatedAt: site.updatedAt,
      },
      organization: {
        name: organization.name,
        timezone: organization.timezone,
        currency: organization.currency,
        locale: organization.locale,
        terminology: organization.terminology,
      },
    };
  },
});

export const updateDraft = mutation({
  args: { config: siteConfigValidator, siteSlug: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const site = await ctx.db
      .query("publicSites")
      .withIndex("by_organization", (q) => q.eq("organizationId", organization._id))
      .unique();
    if (!site) throw new Error("Public site not initialized.");

    let siteSlug = site.siteSlug;
    if (args.siteSlug !== undefined) {
      siteSlug = slugify(requiredTrimmed(args.siteSlug, "siteSlug", 80));
      const existing = await ctx.db
        .query("publicSites")
        .withIndex("by_site_slug", (q) => q.eq("siteSlug", siteSlug))
        .unique();
      if (existing && existing._id !== site._id) {
        throw new Error("That public site slug is already in use.");
      }
    }
    await ctx.db.patch(site._id, {
      siteSlug,
      draft: sanitizeSiteConfig(args.config),
      updatedAt: Date.now(),
    });
    return (await ctx.db.get(site._id))!;
  },
});

export const publish = mutation({
  args: {},
  handler: async (ctx) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const site = await ctx.db
      .query("publicSites")
      .withIndex("by_organization", (q) => q.eq("organizationId", organization._id))
      .unique();
    if (!site) throw new Error("Public site not initialized.");
    const now = Date.now();
    await ctx.db.patch(site._id, {
      published: site.draft,
      publishedAt: now,
      updatedAt: now,
    });
    return {
      siteSlug: site.siteSlug,
      publishedAt: now,
      config: site.draft,
    };
  },
});
