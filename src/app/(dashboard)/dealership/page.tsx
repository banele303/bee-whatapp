"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Car,
  FileCheck,
  Calculator,
  Calendar,
  RefreshCw,
  BarChart3,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import view components from components directory
import { InventoryView } from "@/components/dealership/InventoryView";
import { FinanceAppView } from "@/components/dealership/FinanceAppView";
import { FinanceCalcView } from "@/components/dealership/FinanceCalcView";
import { TestDrivesView } from "@/components/dealership/TestDrivesView";
import { TradeInsView } from "@/components/dealership/TradeInsView";
import { DealerAnalyticsView } from "@/components/dealership/DealerAnalyticsView";

const TABS = [
  { id: "analytics", label: "Overview & Analytics", icon: BarChart3 },
  { id: "inventory", label: "Vehicle Stock", icon: Car },
  { id: "finance-app", label: "SA Finance App", icon: FileCheck },
  { id: "finance-calc", label: "Finance Calculator", icon: Calculator },
  { id: "test-drives", label: "Test Drives", icon: Calendar },
  { id: "trade-ins", label: "Trade-In Appraisals", icon: RefreshCw },
];

export default function DealershipHubPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "analytics";
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-6">
      {/* Top Dealership Hub Header */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  South African Car Dealership Hub
                </h1>
                <span className="bg-primary/20 text-primary text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-primary/30 uppercase tracking-widest">
                  All-In-One Suite
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage stock, SA NCA finance applications, trade-ins, test drives, and loan calculations in one place.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pt-6 border-t border-border/60 mt-6 no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                    : "bg-background/60 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-primary")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content View */}
      <div className="transition-all duration-300">
        {activeTab === "analytics" && <DealerAnalyticsView />}
        {activeTab === "inventory" && <InventoryView />}
        {activeTab === "finance-app" && <FinanceAppView />}
        {activeTab === "finance-calc" && <FinanceCalcView />}
        {activeTab === "test-drives" && <TestDrivesView />}
        {activeTab === "trade-ins" && <TradeInsView />}
      </div>
    </div>
  );
}
