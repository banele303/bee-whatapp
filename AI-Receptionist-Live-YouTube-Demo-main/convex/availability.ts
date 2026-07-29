import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentOrganizationOperator } from "./lib/auth";
import { requireTeamMemberForOrganization } from "./lib/bookings";
import { boundedInteger } from "./lib/validation";

export const listRules = query({
  args: { teamMemberId: v.optional(v.id("teamMembers")) },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    if (args.teamMemberId) {
      await requireTeamMemberForOrganization(
        ctx,
        organization._id,
        args.teamMemberId,
      );
      return await ctx.db
        .query("availabilityRules")
        .withIndex("by_org_member", (q) =>
          q
            .eq("organizationId", organization._id)
            .eq("teamMemberId", args.teamMemberId!),
        )
        .take(101);
    }
    const rows = await ctx.db
      .query("availabilityRules")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .take(1_001);
    if (rows.length > 1_000) throw new Error("Availability rule limit exceeded.");
    return rows.sort(
      (a, b) =>
        a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute,
    );
  },
});

export const replaceMemberRules = mutation({
  args: {
    teamMemberId: v.id("teamMembers"),
    rules: v.array(
      v.object({
        dayOfWeek: v.number(),
        startMinute: v.number(),
        endMinute: v.number(),
        active: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    await requireTeamMemberForOrganization(
      ctx,
      organization._id,
      args.teamMemberId,
    );
    if (args.rules.length > 40) {
      throw new Error("A team member can have at most 40 weekly availability windows.");
    }
    const rules = args.rules.map((rule) => ({
      dayOfWeek: boundedInteger(rule.dayOfWeek, "dayOfWeek", 0, 6),
      startMinute: boundedInteger(rule.startMinute, "startMinute", 0, 1_439),
      endMinute: boundedInteger(rule.endMinute, "endMinute", 1, 1_440),
      active: rule.active ?? true,
    }));
    for (const rule of rules) {
      if (rule.startMinute >= rule.endMinute) {
        throw new Error("Each availability window must end after it starts.");
      }
    }
    for (let day = 0; day < 7; day += 1) {
      const dayRules = rules
        .filter((rule) => rule.active && rule.dayOfWeek === day)
        .sort((a, b) => a.startMinute - b.startMinute);
      for (let index = 1; index < dayRules.length; index += 1) {
        if (dayRules[index].startMinute < dayRules[index - 1].endMinute) {
          throw new Error("Availability windows for the same day cannot overlap.");
        }
      }
    }

    const existing = await ctx.db
      .query("availabilityRules")
      .withIndex("by_org_member", (q) =>
        q
          .eq("organizationId", organization._id)
          .eq("teamMemberId", args.teamMemberId),
      )
      .take(101);
    if (existing.length > 100) {
      throw new Error("Existing availability exceeds the safe replacement limit.");
    }
    for (const rule of existing) await ctx.db.delete(rule._id);

    const now = Date.now();
    for (const rule of rules) {
      await ctx.db.insert("availabilityRules", {
        organizationId: organization._id,
        teamMemberId: args.teamMemberId,
        timezone: organization.timezone,
        ...rule,
        createdAt: now,
        updatedAt: now,
      });
    }
    return await ctx.db
      .query("availabilityRules")
      .withIndex("by_org_member", (q) =>
        q
          .eq("organizationId", organization._id)
          .eq("teamMemberId", args.teamMemberId),
      )
      .take(100);
  },
});
