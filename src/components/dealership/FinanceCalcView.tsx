"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

function formatZAR(amount: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function FinanceCalcView() {
  const [vehiclePrice, setVehiclePrice] = useState(380000);
  const [deposit, setDeposit] = useState(38000);
  const [interestRate, setInterestRate] = useState(11.75);
  const [loanTerm, setLoanTerm] = useState(60);
  const [balloonPercent, setBalloonPercent] = useState(20);

  const principal = Math.max(0, vehiclePrice - deposit);
  const balloonValue = (vehiclePrice * balloonPercent) / 100;
  const monthlyRate = interestRate / 100 / 12;

  const monthlyRepayment =
    ((principal - balloonValue) * (monthlyRate * Math.pow(1 + monthlyRate, loanTerm))) /
      (Math.pow(1 + monthlyRate, loanTerm) - 1) +
    balloonValue * monthlyRate;

  const totalCost = monthlyRepayment * loanTerm + balloonValue + deposit;
  const totalInterest = totalCost - vehiclePrice;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" /> SA Vehicle Finance Calculator
          </h1>
          <p className="text-sm text-muted-foreground">
            Calculate monthly repayments, interest, and balloon payments with South African prime rates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>Vehicle Price</span>
              <span className="text-primary font-bold">{formatZAR(vehiclePrice)}</span>
            </div>
            <input
              type="range"
              min={50000}
              max={1500000}
              step={10000}
              value={vehiclePrice}
              onChange={(e) => setVehiclePrice(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>Deposit ({Math.round((deposit / vehiclePrice) * 100)}%)</span>
              <span className="text-primary font-bold">{formatZAR(deposit)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={vehiclePrice * 0.5}
              step={5000}
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>Interest Rate (Prime + Margin)</span>
              <span className="text-primary font-bold">{interestRate}%</span>
            </div>
            <input
              type="range"
              min={7}
              max={18}
              step={0.25}
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>Loan Term</span>
              <span className="text-primary font-bold">{loanTerm} Months ({loanTerm / 12} Yrs)</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[36, 48, 60, 72].map((months) => (
                <button
                  key={months}
                  onClick={() => setLoanTerm(months)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition ${
                    loanTerm === months
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                  }`}
                >
                  {months} Mo
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>Balloon / Residual Payment ({balloonPercent}%)</span>
              <span className="text-primary font-bold">{formatZAR(balloonValue)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={35}
              step={5}
              value={balloonPercent}
              onChange={(e) => setBalloonPercent(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>

        <div className="md:col-span-5 bg-gradient-to-b from-primary/15 via-card to-card border border-primary/30 rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <span className="text-xs font-bold text-primary tracking-widest uppercase bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
              Estimated Repayment
            </span>
            <div className="text-3xl font-black text-foreground mt-3">
              {formatZAR(isNaN(monthlyRepayment) ? 0 : monthlyRepayment)}
              <span className="text-xs font-normal text-muted-foreground"> / month</span>
            </div>
          </div>

          <div className="space-y-3 text-xs border-t border-border pt-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Principal Loan Amount:</span>
              <span className="font-semibold text-foreground">{formatZAR(principal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Interest Charge:</span>
              <span className="font-semibold text-amber-400">{formatZAR(isNaN(totalInterest) ? 0 : totalInterest)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Final Balloon Lump Sum:</span>
              <span className="font-semibold text-foreground">{formatZAR(balloonValue)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-bold text-sm">
              <span>Total Cost of Credit:</span>
              <span className="text-primary">{formatZAR(isNaN(totalCost) ? 0 : totalCost)}</span>
            </div>
          </div>

          <div className="bg-background/80 rounded-xl p-3 text-[11px] text-muted-foreground border border-border">
            💡 <strong>Pro Tip:</strong> Rates calculated using standard South African vehicle finance formulas. Bank approval subject to FICO and NCA affordability checks.
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinanceCalcView;
