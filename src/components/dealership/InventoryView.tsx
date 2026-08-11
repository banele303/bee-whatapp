"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Car,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Tag,
  Gauge,
  Fuel,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatZAR(amount: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function InventoryView() {
  const inventory = useQuery(api.inventory.list, {}) ?? [];
  const addVehicle = useMutation(api.inventory.add);
  const updateVehicle = useMutation(api.inventory.update);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    price: 250000,
    mileage: 45000,
    colour: "White",
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "SUV",
    status: "available" as const,
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addVehicle({
      make: formData.make,
      model: formData.model,
      year: Number(formData.year),
      price: Number(formData.price),
      mileage: Number(formData.mileage),
      colour: formData.colour,
      fuelType: formData.fuelType,
      transmission: formData.transmission,
      bodyType: formData.bodyType,
      status: formData.status,
      description: formData.description,
    });
    setIsAddOpen(false);
    setFormData({
      make: "",
      model: "",
      year: new Date().getFullYear(),
      price: 250000,
      mileage: 45000,
      colour: "White",
      fuelType: "Petrol",
      transmission: "Automatic",
      bodyType: "SUV",
      status: "available",
      description: "",
    });
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    const matchesSearch =
      `${item.year} ${item.make} ${item.model}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" /> Vehicle Stock Inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage available dealership vehicles, prices, and status.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 active:scale-95"
        >
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search make, model, or year..."
            className="w-full bg-background border border-input rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {["all", "available", "reserved", "sold"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition",
                filterStatus === status
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold">Add New Vehicle to Inventory</h2>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Make</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Toyota"
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
                    placeholder="e.g. Hilux 2.8GD-6"
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
                    required
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Price (ZAR)</label>
                  <input
                    required
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Transmission</label>
                  <select
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  >
                    <option>Automatic</option>
                    <option>Manual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Fuel Type</label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  >
                    <option>Diesel</option>
                    <option>Petrol</option>
                    <option>Hybrid</option>
                    <option>Electric</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredInventory.map((item) => (
          <div
            key={item._id}
            className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition shadow-sm flex flex-col"
          >
            <div className="h-44 bg-gradient-to-br from-primary/10 via-background to-muted flex items-center justify-center relative p-4">
              <Car className="h-16 w-16 text-primary/30 group-hover:scale-110 transition" />
              <span
                className={cn(
                  "absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  item.status === "available" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                  item.status === "reserved" && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                  item.status === "sold" && "bg-muted text-muted-foreground border border-border"
                )}
              >
                {item.status}
              </span>
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-xs font-semibold text-white">
                {item.year}
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition">
                  {item.make} {item.model}
                </h3>
                <p className="text-xl font-extrabold text-primary mt-1">
                  {formatZAR(item.price)}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                <div className="flex items-center gap-1">
                  <Gauge className="h-3.5 w-3.5 text-primary/70" />
                  <span>{item.mileage?.toLocaleString() ?? 0} km</span>
                </div>
                <div className="flex items-center gap-1">
                  <Fuel className="h-3.5 w-3.5 text-primary/70" />
                  <span>{item.fuelType ?? "Petrol"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5 text-primary/70" />
                  <span>{item.transmission ?? "Auto"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <select
                  value={item.status}
                  onChange={(e) =>
                    updateVehicle({
                      id: item._id,
                      status: e.target.value as any,
                    })
                  }
                  className="bg-background border border-input rounded-md px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-primary"
                >
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="sold">Sold</option>
                </select>
                <span className="text-[11px] text-muted-foreground">{item.colour ?? "Standard"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredInventory.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/50">
          <Car className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm font-semibold text-muted-foreground">No vehicles found in stock</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Click "Add Vehicle" to populate your inventory.</p>
        </div>
      )}
    </div>
  );
}

export default InventoryView;
