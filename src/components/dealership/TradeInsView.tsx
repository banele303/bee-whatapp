"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { RefreshCw, Plus } from "lucide-react";

function formatZAR(amount: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function TradeInsView() {
  const tradeIns = useQuery(api.tradeIns.list, {}) ?? [];
  const submitTradeIn = useMutation(api.tradeIns.submit);
  const updateOffer = useMutation(api.tradeIns.updateOffer);

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    make: "VW",
    model: "Polo Vivo 1.4",
    year: 2019,
    mileage: 65000,
    condition: "good" as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitTradeIn({
      ...formData,
      year: Number(formData.year),
      mileage: Number(formData.mileage),
    });
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-primary" /> Vehicle Trade-In Valuations
          </h1>
          <p className="text-sm text-muted-foreground">
            Appraise customer trade-in vehicles and generate valuation offers.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New Trade-In Appraisal
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold">Appraise Trade-In Vehicle</h2>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Customer Name</label>
                  <input
                    required
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                  <input
                    required
                    type="text"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Make</label>
                  <input
                    required
                    type="text"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Model</label>
                  <input
                    required
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Mileage (km)</label>
                  <input
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: Number(e.target.value) })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90"
                >
                  Calculate Estimate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tradeIns.map((item) => (
          <div
            key={item._id}
            className="p-5 rounded-2xl border border-border bg-card space-y-3 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground">
                  {item.year} {item.make} {item.model}
                </h3>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span>Customer: {item.customerName} ({item.customerPhone})</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                {item.condition} condition
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl text-xs">
              <div>
                <div className="text-muted-foreground">Auto System Estimate:</div>
                <div className="text-base font-bold text-foreground mt-0.5">
                  {formatZAR(item.estimatedValue || 0)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Dealer Offer Price:</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">
                  {item.offeredValue ? formatZAR(item.offeredValue) : "Pending Offer"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="number"
                placeholder="Offer ZAR..."
                defaultValue={item.offeredValue}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val > 0) {
                    updateOffer({
                      id: item._id,
                      offeredValue: val,
                      status: "offered",
                    });
                  }
                }}
                className="bg-background border border-input rounded-lg px-3 py-1.5 text-xs flex-1"
              />
              <button
                onClick={() =>
                  updateOffer({
                    id: item._id,
                    offeredValue: item.estimatedValue || 120000,
                    status: "accepted",
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
              >
                Accept Offer
              </button>
            </div>
          </div>
        ))}
      </div>

      {tradeIns.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/50">
          <RefreshCw className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm font-semibold text-muted-foreground">No trade-in appraisals yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Start a new appraisal using the button above.</p>
        </div>
      )}
    </div>
  );
}

export default TradeInsView;
