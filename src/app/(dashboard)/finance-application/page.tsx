"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  FileCheck2,
  Building2,
  CreditCard,
  User,
  ShieldAlert,
  ArrowRight,
  CheckCircle,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatZAR(amount: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function FinanceApplicationPage() {
  const submitApp = useMutation(api.financeApplications.submit);
  const existingApps = useQuery(api.financeApplications.list, {}) ?? [];

  const [step, setStep] = useState(1);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    vehicleOfInterest: "Toyota Hilux 2.8GD-6 Legend",
    vehiclePrice: 450000,
    depositAmount: 50000,
    loanTerm: 60,
    balloonPercent: 20,

    firstName: "",
    lastName: "",
    idNumber: "",
    phone: "",
    email: "",
    maritalStatus: "Single",

    employmentStatus: "Employed",
    employer: "",
    jobTitle: "",
    grossMonthlyIncome: 35000,
    netMonthlyIncome: 28000,

    monthlyRent: 8500,
    monthlyGroceries: 3500,
    monthlyTransport: 2000,
    monthlyInsurance: 1500,
    monthlyDebt: 3000,
    otherExpenses: 1500,
  });

  // NCA Affordability Math (South Africa National Credit Act)
  const totalExpenses =
    Number(formData.monthlyRent || 0) +
    Number(formData.monthlyGroceries || 0) +
    Number(formData.monthlyTransport || 0) +
    Number(formData.monthlyInsurance || 0) +
    Number(formData.monthlyDebt || 0) +
    Number(formData.otherExpenses || 0);

  const netSurplus = Number(formData.netMonthlyIncome || 0) - totalExpenses;

  // Monthly Instalment Estimation (Prime ~11.75%)
  const principal = Math.max(0, formData.vehiclePrice - formData.depositAmount);
  const balloonAmount = (formData.vehiclePrice * formData.balloonPercent) / 100;
  const monthlyInterestRate = 0.1175 / 12;
  const termMonths = formData.loanTerm;
  const estimatedMonthlyInstalment =
    ((principal - balloonAmount) *
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, termMonths))) /
      (Math.pow(1 + monthlyInterestRate, termMonths) - 1) +
    balloonAmount * monthlyInterestRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = await submitApp({
      ...formData,
    });
    setSubmittedId(String(id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/20 via-primary/5 to-background border border-primary/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
            SA NCA Credit Act Compliant
          </span>
          <h1 className="text-2xl font-bold text-foreground mt-2">
            South African Vehicle Finance Application
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-qualify and submit finance requests for WesBank, Absa, MFC & Standard Bank.
          </p>
        </div>
        <div className="text-right bg-card/80 backdrop-blur-md p-3 rounded-xl border border-border">
          <div className="text-xs text-muted-foreground">Est. Monthly Repayment</div>
          <div className="text-xl font-black text-primary">
            {formatZAR(isNaN(estimatedMonthlyInstalment) ? 0 : estimatedMonthlyInstalment)}
          </div>
        </div>
      </div>

      {submittedId ? (
        <div className="bg-card border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4">
          <CheckCircle className="h-14 w-14 text-emerald-400 mx-auto" />
          <h2 className="text-2xl font-bold">Application Submitted Successfully!</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your finance application for <strong>{formData.vehicleOfInterest}</strong> has been logged.
            Our finance specialist will review your NCA surplus of {formatZAR(netSurplus)} and contact you shortly.
          </p>
          <button
            onClick={() => setSubmittedId(null)}
            className="mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
          >
            Start Another Application
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
          {/* Multi-step Nav Indicator */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold pb-4 border-b border-border">
            {[
              { num: 1, label: "Vehicle & Finance" },
              { num: 2, label: "Personal Details" },
              { num: 3, label: "Employment" },
              { num: 4, label: "NCA Expenses" },
            ].map((item) => (
              <button
                key={item.num}
                onClick={() => setStep(item.num)}
                className={cn(
                  "py-2 rounded-lg transition border flex items-center justify-center gap-1.5",
                  step === item.num
                    ? "bg-primary/10 border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                  {item.num}
                </span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" /> Vehicle & Finance Parameters
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Vehicle Choice</label>
                    <input
                      type="text"
                      value={formData.vehicleOfInterest}
                      onChange={(e) => setFormData({ ...formData, vehicleOfInterest: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Vehicle Price (ZAR)</label>
                    <input
                      type="number"
                      value={formData.vehiclePrice}
                      onChange={(e) => setFormData({ ...formData, vehiclePrice: Number(e.target.value) })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Deposit (ZAR)</label>
                    <input
                      type="number"
                      value={formData.depositAmount}
                      onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Term (Months)</label>
                    <select
                      value={formData.loanTerm}
                      onChange={(e) => setFormData({ ...formData, loanTerm: Number(e.target.value) })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    >
                      <option value={36}>36 Months</option>
                      <option value={48}>48 Months</option>
                      <option value={60}>60 Months</option>
                      <option value={72}>72 Months</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Balloon %</label>
                    <input
                      type="number"
                      value={formData.balloonPercent}
                      onChange={(e) => setFormData({ ...formData, balloonPercent: Number(e.target.value) })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">First Name</label>
                    <input
                      required
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                    <input
                      required
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">South African ID Number</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 9201015029088"
                      value={formData.idNumber}
                      onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Mobile Phone</label>
                    <input
                      required
                      type="text"
                      placeholder="082 123 4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Employment & Income
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Employment Status</label>
                    <select
                      value={formData.employmentStatus}
                      onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    >
                      <option>Employed</option>
                      <option>Self-employed</option>
                      <option>Pensioner</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Employer Name</label>
                    <input
                      type="text"
                      value={formData.employer}
                      onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Gross Monthly Income (ZAR)</label>
                    <input
                      type="number"
                      value={formData.grossMonthlyIncome}
                      onChange={(e) => setFormData({ ...formData, grossMonthlyIncome: Number(e.target.value) })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Net Take-Home Salary (ZAR)</label>
                    <input
                      type="number"
                      value={formData.netMonthlyIncome}
                      onChange={(e) => setFormData({ ...formData, netMonthlyIncome: Number(e.target.value) })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" /> NCA Monthly Living Expenses
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Rent / Bond</label>
                    <input
                      type="number"
                      value={formData.monthlyRent}
                      onChange={(e) => setFormData({ ...formData, monthlyRent: Number(e.target.value) })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Groceries</label>
                    <input
                      type="number"
                      value={formData.monthlyGroceries}
                      onChange={(e) => setFormData({ ...formData, monthlyGroceries: Number(e.target.value) })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Transport</label>
                    <input
                      type="number"
                      value={formData.monthlyTransport}
                      onChange={(e) => setFormData({ ...formData, monthlyTransport: Number(e.target.value) })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                </div>

                {/* Affordability Summary Callout */}
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Total Declared Expenses:</span>
                    <span className="text-foreground">{formatZAR(totalExpenses)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>NCA Net Surplus Income:</span>
                    <span className={cn(netSurplus > estimatedMonthlyInstalment ? "text-emerald-400" : "text-rose-400")}>
                      {formatZAR(netSurplus)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80"
                >
                  Back
                </button>
              ) : <div />}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 flex items-center gap-1.5"
                >
                  Next Step <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                >
                  Submit Finance Application <FileCheck2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
