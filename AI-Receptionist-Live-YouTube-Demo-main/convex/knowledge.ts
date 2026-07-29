import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentOrganizationOperator } from "./lib/auth";
import { optionalTrimmed, requiredTrimmed } from "./lib/validation";

export const list = query({
  args: { includeUnpublished: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const rows = args.includeUnpublished
      ? await ctx.db
          .query("knowledgeItems")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", organization._id),
          )
          .take(501)
      : await ctx.db
          .query("knowledgeItems")
          .withIndex("by_org_published", (q) =>
            q.eq("organizationId", organization._id).eq("published", true),
          )
          .take(501);
    if (rows.length > 500) throw new Error("Knowledge item limit exceeded.");
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const upsert = mutation({
  args: {
    knowledgeItemId: v.optional(v.id("knowledgeItems")),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    published: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const now = Date.now();
    const values = {
      title: requiredTrimmed(args.title, "title", 200),
      content: requiredTrimmed(args.content, "content", 20_000),
      category: optionalTrimmed(args.category, "category", 80) ?? "General",
      published: args.published ?? true,
      sortOrder: args.sortOrder ?? 0,
      updatedAt: now,
    };
    if (args.knowledgeItemId) {
      const existing = await ctx.db.get(args.knowledgeItemId);
      if (!existing || existing.organizationId !== organization._id) {
        throw new Error("Knowledge item not found in this organization.");
      }
      await ctx.db.patch(existing._id, values);
      return (await ctx.db.get(existing._id))!;
    }
    const id = await ctx.db.insert("knowledgeItems", {
      organizationId: organization._id,
      ...values,
      createdAt: now,
    });
    return (await ctx.db.get(id))!;
  },
});

export const remove = mutation({
  args: { knowledgeItemId: v.id("knowledgeItems") },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const existing = await ctx.db.get(args.knowledgeItemId);
    if (!existing || existing.organizationId !== organization._id) {
      throw new Error("Knowledge item not found in this organization.");
    }
    await ctx.db.delete(existing._id);
    return null;
  },
});
