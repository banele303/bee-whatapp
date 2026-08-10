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
      .query("testDrives")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const book = mutation({
  args: {
    vehicleId: v.optional(v.string()),
    vehicleLabel: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    scheduledAt: v.number(),
    salesperson: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("testDrives", {
      userId,
      ...args,
      status: "booked",
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("testDrives"),
    status: v.union(
      v.literal("booked"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("no_show"),
      v.literal("cancelled")
    ),
    feedbackRating: v.optional(v.number()),
    feedbackNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Test drive booking not found");
    }

    const updates: Record<string, any> = { status: args.status };
    if (args.feedbackRating !== undefined) updates.feedbackRating = args.feedbackRating;
    if (args.feedbackNote !== undefined) updates.feedbackNote = args.feedbackNote;

    await ctx.db.patch(args.id, updates);
  },
});
