'use client';

import React, { useState } from 'react';
import { FileText, Plus, Send, CheckCircle2, Download, CreditCard } from 'lucide-react';

interface QuoteItem {
  id: string;
  quoteNumber: string;
  customerName: string;
  phone: string;
  subtotalZAR: number;
  vatZAR: number;
  totalZAR: number;
  coreDepositZAR: number;
  status: 'draft' | 'sent' | 'paid';
  createdAt: string;
}

const INITIAL_QUOTES: QuoteItem[] = [
  {
    id: '1',
    quoteNumber: 'INV-2026-081',
    customerName: 'Sipho Workshop (Pretoria West)',
    phone: '+27 82 111 2233',
    subtotalZAR: 2450.00,
    vatZAR: 367.50,
    totalZAR: 2817.50,
    coreDepositZAR: 500.00,
    status: 'sent',
    createdAt: '2026-07-28'
  },
  {
    id: '2',
    quoteNumber: 'INV-2026-082',
    customerName: 'Cape Dental Studio',
    phone: '+27 21 555 4321',
    subtotalZAR: 1800.00,
    vatZAR: 270.00,
    totalZAR: 2070.00,
    coreDepositZAR: 0.00,
    status: 'paid',
    createdAt: '2026-07-28'
  }
];

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteItem[]>(INITIAL_QUOTES);

  const downloadQuotePDF = (quote: QuoteItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quotation_${quote.quoteNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
            .header { display: flex; justify-content: space-between; border-b: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 800; color: #047857; }
            .title { font-size: 20px; font-weight: 700; color: #334155; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .info-box h4 { margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; }
            .info-box p { margin: 0; font-weight: 600; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
            td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .totals { width: 300px; margin-left: auto; background: #f8fafc; pading: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 14px; }
            .total-row.grand { font-weight: 800; font-size: 18px; color: #047857; border-top: 2px solid #10b981; margin-top: 8px; padding-top: 10px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">WACRM Auto Sourcing</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Automative Sourcing & Quote Generator</div>
            </div>
            <div style="text-align: right;">
              <div class="title">OFFICIAL QUOTATION</div>
              <div style="font-size: 14px; font-family: monospace; font-weight: 700; color: #0f172a; margin-top: 4px;">${quote.quoteNumber}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <h4>Customer Details</h4>
              <p>${quote.customerName}</p>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Phone: ${quote.phone}</div>
            </div>
            <div class="info-box">
              <h4>Quote Information</h4>
              <p>Date: ${quote.createdAt}</p>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Status: ${quote.status.toUpperCase()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th style="text-align: right;">Amount (ZAR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Automotive Sourcing Order & Parts Package</td>
                <td>1</td>
                <td style="text-align: right;">R ${quote.subtotalZAR.toFixed(2)}</td>
              </tr>
              ${quote.coreDepositZAR > 0 ? `
              <tr>
                <td>Core Deposit Fee (Refundable upon core return)</td>
                <td>1</td>
                <td style="text-align: right;">R ${quote.coreDepositZAR.toFixed(2)}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row"><span>Subtotal:</span> <span>R ${quote.subtotalZAR.toFixed(2)}</span></div>
            <div class="total-row"><span>15% VAT:</span> <span>R ${quote.vatZAR.toFixed(2)}</span></div>
            ${quote.coreDepositZAR > 0 ? `<div class="total-row"><span>Core Fee:</span> <span>R ${quote.coreDepositZAR.toFixed(2)}</span></div>` : ''}
            <div class="total-row grand"><span>Total Due:</span> <span>R ${quote.totalZAR.toFixed(2)}</span></div>
          </div>

          <div class="footer">
            <p>Thank you for doing business with WACRM Auto Sourcing. Payments supported via Ozow, PayFast & EFT.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-emerald-600" />
            Quotes, Invoices & Payment Links
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create ZAR PDF quotes with 15% VAT, Ozow/PayFast 1-click payment links, and core deposit tracking.
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm self-start md:self-auto">
          <Plus className="w-4 h-4" />
          Create New ZAR Quote
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer & Phone</th>
                <th className="px-6 py-4">Subtotal</th>
                <th className="px-6 py-4">15% VAT</th>
                <th className="px-6 py-4">Core Fee</th>
                <th className="px-6 py-4">Total (ZAR)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                    {q.quoteNumber}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{q.customerName}</div>
                    <div className="text-xs text-slate-400 font-mono">{q.phone}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                    R {q.subtotalZAR.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500">
                    R {q.vatZAR.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-mono text-amber-600 dark:text-amber-400 font-semibold">
                    {q.coreDepositZAR > 0 ? `R ${q.coreDepositZAR.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 font-mono font-extrabold text-slate-900 dark:text-white text-base">
                    R {q.totalZAR.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    {q.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        <Send className="w-3.5 h-3.5" />
                        Sent via WhatsApp
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadQuotePDF(q)}
                        title="Download PDF"
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button title="Send Payment Link" className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                        <CreditCard className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
