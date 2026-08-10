import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("reserved"),
        v.literal("sold"),
        v.literal("in_service")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const items = await ctx.db
      .query("inventory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    if (args.status) {
      return items.filter((item) => item.status === args.status);
    }

    return items;
  },
});

export const get = query({
  args: { id: v.id("inventory") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const add = mutation({
  args: {
    make: v.string(),
    model: v.string(),
    year: v.number(),
    variant: v.optional(v.string()),
    colour: v.optional(v.string()),
    mileage: v.optional(v.number()),
    vin: v.optional(v.string()),
    regNumber: v.optional(v.string()),
    price: v.number(),
    financePrice: v.optional(v.number()),
    status: v.union(
      v.literal("available"),
      v.literal("reserved"),
      v.literal("sold"),
      v.literal("in_service")
    ),
    fuelType: v.optional(v.string()),
    transmission: v.optional(v.string()),
    bodyType: v.optional(v.string()),
    description: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = Date.now();
    return await ctx.db.insert("inventory", {
      userId,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("inventory"),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    variant: v.optional(v.string()),
    colour: v.optional(v.string()),
    mileage: v.optional(v.number()),
    price: v.optional(v.number()),
    financePrice: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("reserved"),
        v.literal("sold"),
        v.literal("in_service")
      )
    ),
    fuelType: v.optional(v.string()),
    transmission: v.optional(v.string()),
    bodyType: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Vehicle not found or unauthorized");
    }
    await ctx.db.patch(id, {
      ...fields,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("inventory") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Vehicle not found or unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});
