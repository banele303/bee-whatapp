import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireActiveClerkOrganization,
  requireCurrentOrganization,
  requireCurrentOrganizationAdmin,
} from "./lib/auth";
import {
  DEFAULT_TERMINOLOGY,
  defaultSiteConfig,
  slugify,
} from "./lib/defaults";
import { assertIanaTimezone } from "./lib/time";
import { optionalTrimmed, requiredTrimmed } from "./lib/validation";

function viewOrganization(
  organization: Awaited<ReturnType<typeof requireCurrentOrganization>>["organization"],
  role?: string,
) {
  return {
    _id: organization._id,
    clerkOrgId: organization.clerkOrgId,
    name: organization.name,
    slug: organization.slug,
    timezone: organization.timezone,
    currency: organization.currency,
    locale: organization.locale,
    terminology: organization.terminology,
    role,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

export const bootstrapCurrent = mutation({
  args: {
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireActiveClerkOrganization(ctx);
    if (auth.role !== "admin" && auth.role !== "owner") {
      throw new Error("An organization admin must initialize this workspace.");
    }

    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", auth.clerkOrgId))
      .unique();
    if (existing) return viewOrganization(existing, auth.role);

    const name = requiredTrimmed(
      args.name ??
        auth.clerkOrgSlug
          ?.split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ") ??
        "New organization",
      "name",
      120,
    );
    const timezone = optionalTrimmed(args.timezone, "timezone", 100) ?? "UTC";
    assertIanaTimezone(timezone);
    const currency = (args.currency ?? "USD").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("currency must be a three-letter ISO 4217 code.");
    }
    const locale = optionalTrimmed(args.locale, "locale", 35) ?? "en-US";
    try {
      new Intl.Locale(locale);
    } catch {
      throw new Error(`Invalid locale: "${locale}".`);
    }

    const preferredSlug = slugify(auth.clerkOrgSlug ?? name);
    const slugOwner = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", preferredSlug))
      .unique();
    const slug = slugOwner
      ? `${preferredSlug}-${slugify(auth.clerkOrgId).slice(-8)}`
      : preferredSlug;
    const now = Date.now();
    const defaultAgentId = process.env.ELEVENLABS_DEFAULT_AGENT_ID?.trim();
    if (defaultAgentId && defaultAgentId.length > 200) {
      throw new Error("ELEVENLABS_DEFAULT_AGENT_ID is invalid.");
    }
    const organizationId = await ctx.db.insert("organizations", {
      clerkOrgId: auth.clerkOrgId,
      name,
      slug,
      timezone,
      currency,
      locale,
      terminology: DEFAULT_TERMINOLOGY,
      createdAt: now,
      updatedAt: now,
    });

    await Promise.all([
      ctx.db.insert("publicSites", {
        organizationId,
        siteSlug: slug,
        draft: defaultSiteConfig(name),
        createdAt: now,
        updatedAt: now,
      }),
      ctx.db.insert("agentIntegrations", {
        organizationId,
        provider: "elevenlabs",
        ...(defaultAgentId
          ? {
              webAgentId: defaultAgentId,
            }
          : {}),
        webEnabled: Boolean(defaultAgentId),
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    const organization = (await ctx.db.get(organizationId))!;
    return viewOrganization(organization, auth.role);
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireActiveClerkOrganization(ctx);
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", auth.clerkOrgId))
      .unique();
    if (!organization) return null;
    return viewOrganization(organization, auth.role);
  },
});

export const updateCurrent = mutation({
  args: {
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    locale: v.optional(v.string()),
    terminology: v.optional(
      v.object({
        offeringSingular: v.string(),
        offeringPlural: v.string(),
        teamMemberSingular: v.string(),
        teamMemberPlural: v.string(),
        customerSingular: v.string(),
        customerPlural: v.string(),
        bookingSingular: v.string(),
        bookingPlural: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { auth, organization } = await requireCurrentOrganizationAdmin(ctx);
    const timezone = args.timezone?.trim();
    if (timezone) assertIanaTimezone(timezone);
    const currency = args.currency?.trim().toUpperCase();
    if (currency && !/^[A-Z]{3}$/.test(currency)) {
      throw new Error("currency must be a three-letter ISO 4217 code.");
    }
    const locale = optionalTrimmed(args.locale, "locale", 35);
    if (locale) {
      try {
        new Intl.Locale(locale);
      } catch {
        throw new Error(`Invalid locale: "${locale}".`);
      }
    }
    const terminology = args.terminology
      ? Object.fromEntries(
          Object.entries(args.terminology).map(([key, value]) => [
            key,
            requiredTrimmed(value, `terminology.${key}`, 40),
          ]),
        ) as typeof args.terminology
      : undefined;

    if (timezone && timezone !== organization.timezone) {
      const availabilityRules = await ctx.db
        .query("availabilityRules")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .take(501);
      if (availabilityRules.length > 500) {
        throw new Error(
          "This organization has too many availability rules for an atomic timezone change.",
        );
      }
      for (const rule of availabilityRules) {
        await ctx.db.patch(rule._id, { timezone, updatedAt: Date.now() });
      }
    }
    if (currency && currency !== organization.currency) {
      const offerings = await ctx.db
        .query("offerings")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .take(501);
      if (offerings.length > 500) {
        throw new Error(
          "This organization has too many offerings for an atomic currency change.",
        );
      }
      for (const offering of offerings) {
        await ctx.db.patch(offering._id, { currency, updatedAt: Date.now() });
      }
    }

    await ctx.db.patch(organization._id, {
      name: args.name
        ? requiredTrimmed(args.name, "name", 120)
        : organization.name,
      timezone: timezone ?? organization.timezone,
      currency: currency ?? organization.currency,
      locale: locale ?? organization.locale,
      terminology: terminology ?? organization.terminology,
      updatedAt: Date.now(),
    });
    return viewOrganization((await ctx.db.get(organization._id))!, auth.role);
  },
});
