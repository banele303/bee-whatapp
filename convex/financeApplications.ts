import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("under_review"),
        v.literal("approved"),
        v.literal("declined"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const apps = await ctx.db
      .query("financeApplications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    if (args.status) {
      return apps.filter((a) => a.status === args.status);
    }
    return apps;
  },
});

export const get = query({
  args: { id: v.id("financeApplications") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const submit = mutation({
  args: {
    vehicleOfInterest: v.optional(v.string()),
    vehiclePrice: v.optional(v.number()),
    depositAmount: v.optional(v.number()),
    tradeInValue: v.optional(v.number()),
    loanTerm: v.optional(v.number()),
    balloonPercent: v.optional(v.number()),

    firstName: v.string(),
    lastName: v.string(),
    idNumber: v.string(),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.string(),
    maritalStatus: v.optional(v.string()),
    dependants: v.optional(v.number()),

    streetAddress: v.optional(v.string()),
    suburb: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),

    employmentStatus: v.optional(v.string()),
    employer: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    employmentYears: v.optional(v.number()),
    grossMonthlyIncome: v.optional(v.number()),
    netMonthlyIncome: v.optional(v.number()),

    monthlyRent: v.optional(v.number()),
    monthlyGroceries: v.optional(v.number()),
    monthlyTransport: v.optional(v.number()),
    monthlyInsurance: v.optional(v.number()),
    monthlyDebt: v.optional(v.number()),
    otherExpenses: v.optional(v.number()),

    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = Date.now();

    return await ctx.db.insert("financeApplications", {
      userId,
      ...args,
      status: "submitted",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("financeApplications"),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Application not found or unauthorized");
    }

    const updates: Record<string, any> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.notes) updates.notes = args.notes;
    if (args.status === "approved" || args.status === "declined") {
      updates.decidedAt = Date.now();
    }

    await ctx.db.patch(args.id, updates);
  },
});
