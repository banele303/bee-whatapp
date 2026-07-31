'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Send, CheckCircle2, Download, CreditCard, MessageCircle, Bot } from 'lucide-react';

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
  source: string;
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/quotes')
      .then(res => res.json())
      .then(data => {
        if (!data.error && Array.isArray(data)) {
          const mapped = data.map((d: any) => ({
            id: d.id,
            quoteNumber: d.quote_number,
            customerName: d.customer_name,
            phone: d.phone_number,
            subtotalZAR: d.subtotal || 0,
            vatZAR: d.vat_amount || 0,
            totalZAR: d.total_amount || 0,
            coreDepositZAR: d.core_deposit || 0,
            status: d.status || 'draft',
            createdAt: new Date(d.created_at).toISOString().split('T')[0],
            source: d.source || 'web'
          }));
          setQuotes(mapped);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch quotes', err);
        setLoading(false);
      });
  }, []);

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
            .totals { width: 300px; margin-left: auto; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 14px; }
            .total-row.grand { font-weight: 800; font-size: 18px; color: #047857; border-top: 2px solid #10b981; margin-top: 8px; padding-top: 10px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">WACRM Auto Sourcing</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Automotive Sourcing & Quote Generator</div>
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

  const getSourceBadge = (source: string) => {
    if (source === 'ai' || source === 'copilot') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <Bot className="w-3 h-3" />
          AI Generated
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
        <FileText className="w-3 h-3" />
        Manual
      </span>
    );
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-3">
            <FileText className="w-8 h-8 text-emerald-600" />
            Quotes, Invoices & Payment Links
          </h1>
          <p className="text-muted-foreground mt-1">
            Create ZAR PDF quotes with 15% VAT, Ozow/PayFast 1-click payment links, and core deposit tracking.
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm self-start md:self-auto">
          <Plus className="w-4 h-4" />
          Create New ZAR Quote
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="bg-muted/50 text-foreground text-xs uppercase font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer & Phone</th>
                <th className="px-6 py-4">Subtotal</th>
                <th className="px-6 py-4">15% VAT</th>
                <th className="px-6 py-4">Total (ZAR)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Loading quotes...
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No quotes found.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-foreground">
                        {q.quoteNumber}
                      </div>
                      <div className="mt-1">
                        {getSourceBadge(q.source)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{q.customerName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{q.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">
                      R {q.subtotalZAR.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">
                      R {q.vatZAR.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono font-extrabold text-foreground text-base">
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
                          Sent
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => downloadQuotePDF(q)}
                          title="Download PDF"
                          className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button title="Send via WhatsApp" className="p-2 rounded-lg border border-border hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-950 dark:hover:text-emerald-400 dark:hover:border-emerald-900 transition-colors cursor-pointer text-muted-foreground">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button title="Send Payment Link" className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-sm">
                          <CreditCard className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
