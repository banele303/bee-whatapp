"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Car,
  FileCheck,
  Calendar,
  RefreshCw,
  Zap,
  BarChart3,
} from "lucide-react";

function formatZAR(amount: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DealerAnalyticsView() {
  const stats = useQuery(api.dealerStats.getOverview, {}) ?? {
    totalVehicles: 0,
    availableStockCount: 0,
    availableStockValue: 0,
    totalFinanceApps: 0,
    approvedFinanceApps: 0,
    testDrivesBooked: 0,
    pendingTradeIns: 0,
  };

  const approvalRate =
    stats.totalFinanceApps > 0
      ? Math.round((stats.approvedFinanceApps / stats.totalFinanceApps) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Dealership Performance Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time metrics for inventory value, finance approval rates, and sales lead conversion.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Available Inventory Value</span>
            <Car className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {formatZAR(stats.availableStockValue)}
          </div>
          <div className="text-xs text-emerald-400 font-medium">
            {stats.availableStockCount} Vehicles Ready on Lot
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Finance Approval Rate</span>
            <FileCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{approvalRate}%</div>
          <div className="text-xs text-muted-foreground">
            {stats.approvedFinanceApps} of {stats.totalFinanceApps} Applications Approved
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Test Drives Scheduled</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{stats.testDrivesBooked}</div>
          <div className="text-xs text-primary font-medium">Active Bookings This Month</div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Pending Trade-In Appraisals</span>
            <RefreshCw className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{stats.pendingTradeIns}</div>
          <div className="text-xs text-amber-400 font-medium">Awaiting Valuation Offer</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Dealership Pipeline Insights
        </h2>

        <div className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between mb-1 font-semibold">
              <span>Finance Approval Success Rate ({approvalRate}%)</span>
              <span>{stats.approvedFinanceApps} / {stats.totalFinanceApps} Deals</span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, approvalRate))}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 font-semibold">
              <span>Lot Capacity Utilization</span>
              <span>{stats.totalVehicles} Vehicles Total</span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.totalVehicles / 25) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DealerAnalyticsView;
