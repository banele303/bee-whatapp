"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Car,
  Plus,
  Search,
  Filter,
  Gauge,
  Fuel,
  Wrench,
  LayoutList,
  LayoutGrid,
  Image as ImageIcon,
  Trash2,
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
  const removeVehicle = useMutation(api.inventory.remove);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
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
    imageUrl: "",
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
      images: formData.imageUrl.trim() ? [formData.imageUrl.trim()] : undefined,
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
      imageUrl: "",
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
            Manage available dealership vehicles, prices, and stock images in a compact layout.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Switcher Toggle */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode("list")}
              title="Compact List View"
              className={cn(
                "p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition",
                viewMode === "list"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">Compact List</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={cn(
                "p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition",
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 active:scale-95"
          >
            <Plus className="h-4 w-4" /> Add Vehicle
          </button>
        </div>
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
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {["all", "available", "reserved", "sold"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition whitespace-nowrap",
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

      {/* Add Vehicle Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
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

              {/* Image URL Input Field */}
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-primary" /> Car Photo URL / Image Link
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or image direct link"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                />
                {formData.imageUrl && (
                  <div className="mt-2 h-24 w-full rounded-lg border border-border overflow-hidden bg-black/40 relative">
                    <img
                      src={formData.imageUrl}
                      alt="Car Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
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

      {/* COMPACT LIST VIEW MODE (DEFAULT) */}
      {viewMode === "list" ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Year & Specs</th>
                  <th className="py-3 px-4">Mileage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Asking Price</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInventory.map((item) => {
                  const carImg = item.images?.[0];
                  return (
                    <tr key={item._id} className="hover:bg-muted/30 transition group">
                      {/* Vehicle Column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-16 shrink-0 rounded-lg border border-border bg-black/40 overflow-hidden flex items-center justify-center">
                            {carImg ? (
                              <img src={carImg} alt={`${item.make} ${item.model}`} className="h-full w-full object-cover" />
                            ) : (
                              <Car className="h-6 w-6 text-primary/40" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-foreground group-hover:text-primary transition">
                              {item.make} {item.model}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{item.colour ?? "Standard"}</div>
                          </div>
                        </div>
                      </td>

                      {/* Year & Specs */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{item.year}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {item.fuelType ?? "Petrol"} · {item.transmission ?? "Auto"}
                        </div>
                      </td>

                      {/* Mileage */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">
                          {item.mileage?.toLocaleString() ?? 0} km
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            updateVehicle({
                              id: item._id,
                              status: e.target.value as any,
                            })
                          }
                          className={cn(
                            "bg-background border rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wider outline-none cursor-pointer",
                            item.status === "available" && "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
                            item.status === "reserved" && "border-amber-500/40 text-amber-400 bg-amber-500/10",
                            item.status === "sold" && "border-border text-muted-foreground bg-muted"
                          )}
                        >
                          <option value="available">Available</option>
                          <option value="reserved">Reserved</option>
                          <option value="sold">Sold</option>
                        </select>
                      </td>

                      {/* Asking Price */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-sm text-primary">
                          {formatZAR(item.price)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => removeVehicle({ id: item._id })}
                          title="Delete vehicle"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW MODE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredInventory.map((item) => {
            const carImg = item.images?.[0];
            return (
              <div
                key={item._id}
                className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition shadow-sm flex flex-col"
              >
                <div className="h-44 bg-black/40 flex items-center justify-center relative overflow-hidden">
                  {carImg ? (
                    <img src={carImg} alt={`${item.make} ${item.model}`} className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <Car className="h-16 w-16 text-primary/30 group-hover:scale-110 transition" />
                  )}
                  <span
                    className={cn(
                      "absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md",
                      item.status === "available" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                      item.status === "reserved" && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                      item.status === "sold" && "bg-muted text-muted-foreground border border-border"
                    )}
                  >
                    {item.status}
                  </span>
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-xs font-semibold text-white">
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
                    <button
                      onClick={() => removeVehicle({ id: item._id })}
                      className="text-muted-foreground hover:text-rose-400 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
