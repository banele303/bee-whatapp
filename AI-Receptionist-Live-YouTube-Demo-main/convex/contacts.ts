import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentOrganizationOperator } from "./lib/auth";
import { findOrCreateContact } from "./lib/bookings";
import { boundedInteger, optionalTrimmed } from "./lib/validation";

export const list = query({
  args: { limit: v.optional(v.number()), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const limit = boundedInteger(args.limit ?? 100, "limit", 1, 200);
    const search = args.search?.trim().toLowerCase();
    const scanLimit = search ? 1_000 : limit;
    const rows = await ctx.db
      .query("contacts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .take(scanLimit);
    return rows
      .filter(
        (contact) =>
          !search ||
          contact.name.toLowerCase().includes(search) ||
          contact.emailNormalized?.includes(search) ||
          contact.phoneNormalized?.includes(search),
      )
      .slice(0, limit);
  },
});

export const upsert = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const contact = await findOrCreateContact(ctx, organization._id, args);
    const tags = args.tags
      ? [...new Set(args.tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 30)
      : contact.tags;
    await ctx.db.patch(contact._id, {
      notes:
        args.notes === undefined
          ? contact.notes
          : optionalTrimmed(args.notes, "notes", 5_000),
      tags,
      updatedAt: Date.now(),
    });
    return (await ctx.db.get(contact._id))!;
  },
});
