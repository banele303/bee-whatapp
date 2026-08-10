import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        totalVehicles: 0,
        availableStockValue: 0,
        totalFinanceApps: 0,
        approvedFinanceApps: 0,
        testDrivesBooked: 0,
        pendingTradeIns: 0,
      };
    }

    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const financeApps = await ctx.db
      .query("financeApplications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const testDrives = await ctx.db
      .query("testDrives")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const tradeIns = await ctx.db
      .query("tradeIns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const availableStock = inventory.filter((i) => i.status === "available");
    const stockValue = availableStock.reduce((sum, item) => sum + (item.price || 0), 0);
    const approvedApps = financeApps.filter((a) => a.status === "approved").length;
    const pendingTradeIns = tradeIns.filter((t) => t.status === "pending" || t.status === "valued").length;

    return {
      totalVehicles: inventory.length,
      availableStockCount: availableStock.length,
      availableStockValue: stockValue,
      totalFinanceApps: financeApps.length,
      approvedFinanceApps: approvedApps,
      testDrivesBooked: testDrives.length,
      pendingTradeIns,
    };
  },
});
