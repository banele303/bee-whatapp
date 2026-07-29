import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireCurrentOrganizationOperator } from "./lib/auth";
import { boundedInteger } from "./lib/validation";

export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
    channel: v.optional(v.literal("web")),
  },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const limit = boundedInteger(args.limit ?? 25, "limit", 1, 100);
    return args.channel
      ? await ctx.db
          .query("conversations")
          .withIndex("by_org_channel_started", (q) =>
            q
              .eq("organizationId", organization._id)
              .eq("channel", args.channel!),
          )
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("conversations")
          .withIndex("by_org_started", (q) =>
            q.eq("organizationId", organization._id),
          )
          .order("desc")
          .take(limit);
  },
});
