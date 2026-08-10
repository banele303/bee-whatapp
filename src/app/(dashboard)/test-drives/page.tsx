"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Calendar, Clock, Plus, User, Phone, Car, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TestDrivesPage() {
  const testDrives = useQuery(api.testDrives.list, {}) ?? [];
  const bookDrive = useMutation(api.testDrives.book);
  const updateStatus = useMutation(api.testDrives.updateStatus);

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicleLabel: "2023 Toyota Hilux 2.8GD-6",
    customerName: "",
    customerPhone: "",
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledTime: "10:00",
    salesperson: "Sarah Jenkins",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).getTime();
    await bookDrive({
      vehicleLabel: formData.vehicleLabel,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      scheduledAt,
      salesperson: formData.salesperson,
      notes: formData.notes,
    });
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" /> Test Drive Bookings
          </h1>
          <p className="text-sm text-muted-foreground">
            Schedule, track, and record customer test drive appointments.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Book Test Drive
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold">Schedule New Test Drive</h2>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Vehicle</label>
                <input
                  required
                  type="text"
                  value={formData.vehicleLabel}
                  onChange={(e) => setFormData({ ...formData, vehicleLabel: e.target.value })}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Customer Name</label>
                  <input
                    required
                    type="text"
                    placeholder="John Doe"
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
                    placeholder="082 123 4567"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Time</label>
                  <input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                  />
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
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bookings List */}
      <div className="space-y-3">
        {testDrives.map((drive) => (
          <div
            key={drive._id}
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">{drive.vehicleLabel}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {drive.customerName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {drive.customerPhone}
                  </span>
                  <span className="flex items-center gap-1 text-primary">
                    <Clock className="h-3 w-3" /> {new Date(drive.scheduledAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={drive.status}
                onChange={(e) =>
                  updateStatus({ id: drive._id, status: e.target.value as any })
                }
                className="bg-background border border-input rounded-md px-3 py-1 text-xs font-semibold"
              >
                <option value="booked">Booked</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        ))}

        {testDrives.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/50">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-muted-foreground">No test drives scheduled</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Book your first test drive using the button above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
