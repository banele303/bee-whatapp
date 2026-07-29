import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentOrganizationOperator } from "./lib/auth";
import {
  requireOfferingForOrganization,
  requireTeamMemberForOrganization,
} from "./lib/bookings";
import { normalizedEmail, optionalTrimmed, requiredTrimmed } from "./lib/validation";

async function validateOfferingIds(
  ctx: Parameters<typeof requireOfferingForOrganization>[0],
  organizationId: Parameters<typeof requireOfferingForOrganization>[1],
  offeringIds: Parameters<typeof requireOfferingForOrganization>[2][],
) {
  const uniqueIds = [...new Set(offeringIds)];
  if (uniqueIds.length > 100) throw new Error("A team member can have at most 100 offerings.");
  for (const offeringId of uniqueIds) {
    await requireOfferingForOrganization(ctx, organizationId, offeringId);
  }
  return uniqueIds;
}

export const listMembers = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const rows = args.includeInactive
      ? await ctx.db
          .query("teamMembers")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", organization._id),
          )
          .take(501)
      : await ctx.db
          .query("teamMembers")
          .withIndex("by_org_active", (q) =>
            q.eq("organizationId", organization._id).eq("active", true),
          )
          .take(501);
    if (rows.length > 500) throw new Error("Team member limit exceeded.");
    return rows.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  },
});

export const createMember = mutation({
  args: {
    name: v.string(),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    offeringIds: v.array(v.id("offerings")),
    active: v.optional(v.boolean()),
    acceptingBookings: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const offeringIds = await validateOfferingIds(
      ctx,
      organization._id,
      args.offeringIds,
    );
    const now = Date.now();
    const id = await ctx.db.insert("teamMembers", {
      organizationId: organization._id,
      name: requiredTrimmed(args.name, "name", 120),
      title: optionalTrimmed(args.title, "title", 120) ?? "Team member",
      bio: optionalTrimmed(args.bio, "bio", 2_000) ?? "",
      email: normalizedEmail(args.email),
      phone: optionalTrimmed(args.phone, "phone", 40),
      imageUrl: optionalTrimmed(args.imageUrl, "imageUrl", 2_000),
      offeringIds,
      active: args.active ?? true,
      acceptingBookings: args.acceptingBookings ?? true,
      sortOrder: args.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });
    return (await ctx.db.get(id))!;
  },
});

export const updateMember = mutation({
  args: {
    teamMemberId: v.id("teamMembers"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    offeringIds: v.optional(v.array(v.id("offerings"))),
    active: v.optional(v.boolean()),
    acceptingBookings: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const member = await requireTeamMemberForOrganization(
      ctx,
      organization._id,
      args.teamMemberId,
    );
    const offeringIds = args.offeringIds
      ? await validateOfferingIds(ctx, organization._id, args.offeringIds)
      : member.offeringIds;
    await ctx.db.patch(member._id, {
      name: args.name ? requiredTrimmed(args.name, "name", 120) : member.name,
      title:
        args.title === undefined
          ? member.title
          : optionalTrimmed(args.title, "title", 120) ?? "Team member",
      bio:
        args.bio === undefined
          ? member.bio
          : optionalTrimmed(args.bio, "bio", 2_000) ?? "",
      email: args.email === undefined ? member.email : normalizedEmail(args.email),
      phone:
        args.phone === undefined
          ? member.phone
          : optionalTrimmed(args.phone, "phone", 40),
      imageUrl:
        args.imageUrl === undefined
          ? member.imageUrl
          : optionalTrimmed(args.imageUrl, "imageUrl", 2_000),
      offeringIds,
      active: args.active ?? member.active,
      acceptingBookings: args.acceptingBookings ?? member.acceptingBookings,
      sortOrder: args.sortOrder ?? member.sortOrder,
      updatedAt: Date.now(),
    });
    return (await ctx.db.get(member._id))!;
  },
});
