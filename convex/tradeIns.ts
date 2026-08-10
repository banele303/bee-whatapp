import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("tradeIns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const submit = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    mileage: v.number(),
    colour: v.optional(v.string()),
    regNumber: v.optional(v.string()),
    condition: v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("poor")
    ),
    serviceHistory: v.optional(v.boolean()),
    accidentHistory: v.optional(v.boolean()),
    customerAskingPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = Date.now();

    // Auto-estimate value based on age, mileage, and condition factor
    const age = Math.max(1, new Date().getFullYear() - args.year);
    const baseValue = Math.max(30000, 350000 - age * 30000 - (args.mileage / 1000) * 800);
    const conditionMultiplier =
      args.condition === "excellent" ? 1.1 : args.condition === "good" ? 1.0 : args.condition === "fair" ? 0.85 : 0.7;
    const estimatedValue = Math.round(baseValue * conditionMultiplier);

    return await ctx.db.insert("tradeIns", {
      userId,
      ...args,
      estimatedValue,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateOffer = mutation({
  args: {
    id: v.id("tradeIns"),
    offeredValue: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("valued"),
      v.literal("offered"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Trade-in not found");
    }

    await ctx.db.patch(args.id, {
      offeredValue: args.offeredValue,
      status: args.status,
      notes: args.notes ?? existing.notes,
      updatedAt: Date.now(),
    });
  },
});
