import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireCurrentOrganizationOperator } from "./lib/auth";
import {
  MAX_BUFFER_MINUTES,
  MAX_OFFERING_DURATION_MINUTES,
  requireOfferingForOrganization,
} from "./lib/bookings";
import { slugify } from "./lib/defaults";
import { boundedInteger, optionalTrimmed, requiredTrimmed } from "./lib/validation";

function offeringView(offering: Doc<"offerings">) {
  return offering;
}

export const listOfferings = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const rows = args.includeInactive
      ? await ctx.db
          .query("offerings")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", organization._id),
          )
          .take(501)
      : await ctx.db
          .query("offerings")
          .withIndex("by_org_active", (q) =>
            q.eq("organizationId", organization._id).eq("active", true),
          )
          .take(501);
    if (rows.length > 500) throw new Error("Offering limit exceeded.");
    return rows
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
      .map(offeringView);
  },
});

export const createOffering = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    durationMinutes: v.number(),
    bufferBeforeMinutes: v.optional(v.number()),
    bufferAfterMinutes: v.optional(v.number()),
    priceMinor: v.number(),
    capacity: v.optional(v.number()),
    active: v.optional(v.boolean()),
    bookableOnline: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const name = requiredTrimmed(args.name, "name", 120);
    const baseSlug = slugify(name);
    const existing = await ctx.db
      .query("offerings")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", organization._id).eq("slug", baseSlug),
      )
      .first();
    const slug = existing ? `${baseSlug}-${Date.now().toString(36).slice(-5)}` : baseSlug;
    const now = Date.now();
    const id = await ctx.db.insert("offerings", {
      organizationId: organization._id,
      name,
      slug,
      description: optionalTrimmed(args.description, "description", 2_000) ?? "",
      category: optionalTrimmed(args.category, "category", 80) ?? "General",
      durationMinutes: boundedInteger(
        args.durationMinutes,
        "durationMinutes",
        5,
        MAX_OFFERING_DURATION_MINUTES,
      ),
      bufferBeforeMinutes: boundedInteger(
        args.bufferBeforeMinutes ?? 0,
        "bufferBeforeMinutes",
        0,
        MAX_BUFFER_MINUTES,
      ),
      bufferAfterMinutes: boundedInteger(
        args.bufferAfterMinutes ?? 0,
        "bufferAfterMinutes",
        0,
        MAX_BUFFER_MINUTES,
      ),
      priceMinor: boundedInteger(args.priceMinor, "priceMinor", 0, 100_000_000),
      currency: organization.currency,
      capacity: boundedInteger(args.capacity ?? 1, "capacity", 1, 10_000),
      active: args.active ?? true,
      bookableOnline: args.bookableOnline ?? true,
      createdAt: now,
      updatedAt: now,
    });
    return offeringView((await ctx.db.get(id))!);
  },
});

export const updateOffering = mutation({
  args: {
    offeringId: v.id("offerings"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    bufferBeforeMinutes: v.optional(v.number()),
    bufferAfterMinutes: v.optional(v.number()),
    priceMinor: v.optional(v.number()),
    capacity: v.optional(v.number()),
    active: v.optional(v.boolean()),
    bookableOnline: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const offering = await requireOfferingForOrganization(
      ctx,
      organization._id,
      args.offeringId,
    );
    await ctx.db.patch(offering._id, {
      name: args.name ? requiredTrimmed(args.name, "name", 120) : offering.name,
      description:
        args.description === undefined
          ? offering.description
          : optionalTrimmed(args.description, "description", 2_000) ?? "",
      category:
        args.category === undefined
          ? offering.category
          : optionalTrimmed(args.category, "category", 80) ?? "General",
      durationMinutes:
        args.durationMinutes === undefined
          ? offering.durationMinutes
          : boundedInteger(
              args.durationMinutes,
              "durationMinutes",
              5,
              MAX_OFFERING_DURATION_MINUTES,
            ),
      bufferBeforeMinutes:
        args.bufferBeforeMinutes === undefined
          ? offering.bufferBeforeMinutes
          : boundedInteger(
              args.bufferBeforeMinutes,
              "bufferBeforeMinutes",
              0,
              MAX_BUFFER_MINUTES,
            ),
      bufferAfterMinutes:
        args.bufferAfterMinutes === undefined
          ? offering.bufferAfterMinutes
          : boundedInteger(
              args.bufferAfterMinutes,
              "bufferAfterMinutes",
              0,
              MAX_BUFFER_MINUTES,
            ),
      priceMinor:
        args.priceMinor === undefined
          ? offering.priceMinor
          : boundedInteger(args.priceMinor, "priceMinor", 0, 100_000_000),
      capacity:
        args.capacity === undefined
          ? offering.capacity
          : boundedInteger(args.capacity, "capacity", 1, 10_000),
      active: args.active ?? offering.active,
      bookableOnline: args.bookableOnline ?? offering.bookableOnline,
      updatedAt: Date.now(),
    });
    return offeringView((await ctx.db.get(offering._id))!);
  },
});
