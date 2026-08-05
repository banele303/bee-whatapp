import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ai/admin-client'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = supabaseAdmin()

    const { data: quote, error } = await db
      .from('quotes_and_invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !quote) {
      return new NextResponse('Quotation not found', { status: 404 })
    }

    const { data: account } = await db
      .from('accounts')
      .select('name')
      .eq('id', quote.account_id)
      .maybeSingle()

    const businessName = account?.name || 'Bee WhatsApp Auto Parts'
    const createdDate = new Date(quote.created_at).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const itemsHtml = (quote.items || [])
      .map(
        (item: any, index: number) => `
        <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
          <td class="py-3 px-4 text-xs font-mono text-gray-500">${index + 1}</td>
          <td class="py-3 px-4">
            <p class="font-medium text-gray-900 text-sm">${item.description || item.name || 'Auto Part'}</p>
            <p class="text-xs text-gray-500 font-mono">SKU: ${item.sku || 'N/A'}</p>
          </td>
          <td class="py-3 px-4 text-right text-sm text-gray-700 font-mono">${item.quantity}</td>
          <td class="py-3 px-4 text-right text-sm text-gray-700 font-mono">R ${Number(item.unitPrice || item.price || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          <td class="py-3 px-4 text-right text-sm font-semibold text-gray-900 font-mono">R ${(Number(item.quantity) * Number(item.unitPrice || item.price || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
      `
      )
      .join('')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation ${quote.quote_number} - ${businessName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { background: white; -webkit-print-color-adjust: exact; }
      .no-print { display: none !important; }
      .print-shadow-none { box-shadow: none !important; border: none !important; }
    }
  </style>
</head>
<body class="bg-slate-100 min-h-screen text-slate-800 font-sans p-4 md:p-8">
  
  <!-- Printable Container -->
  <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print-shadow-none border border-slate-200/80">
    
    <!-- Top Action Bar (hidden on print) -->
    <div class="no-print bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">Official Auto Parts Quotation</span>
      </div>
      <div class="flex items-center gap-3">
        <button onclick="window.print()" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 002-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Print / Save PDF
        </button>
      </div>
    </div>

    <!-- Header Section -->
    <div class="p-8 md:p-10 border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white relative">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg">
              ⚙️
            </div>
            <h1 class="text-2xl font-bold tracking-tight">${businessName}</h1>
          </div>
          <p class="text-slate-400 text-xs font-mono">Premium Auto Parts & Accessories • South Africa</p>
        </div>

        <div class="text-left md:text-right bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 mb-1">
            QUOTATION
          </span>
          <h2 class="text-xl font-mono font-bold text-white tracking-wide">${quote.quote_number}</h2>
          <p class="text-slate-400 text-xs font-mono mt-1">Date: ${createdDate}</p>
        </div>
      </div>
    </div>

    <!-- Client & Quotation Meta -->
    <div class="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 bg-slate-50/50">
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Prepared For</h3>
        <p class="text-base font-semibold text-slate-900">${quote.customer_name || 'Valued Customer'}</p>
        ${quote.phone_number ? `<p class="text-sm text-slate-600 font-mono mt-0.5">📞 ${quote.phone_number}</p>` : ''}
      </div>
      <div class="md:text-right">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Validity & Terms</h3>
        <p class="text-sm text-slate-700"><span class="font-medium">Valid For:</span> 7 Days</p>
        <p class="text-sm text-slate-700"><span class="font-medium">Currency:</span> ZAR (Rands)</p>
        <p class="text-sm text-slate-700"><span class="font-medium">VAT Rate:</span> 15% Standard SA Rate</p>
      </div>
    </div>

    <!-- Itemized Parts Table -->
    <div class="p-8 md:p-10">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Itemized Parts Breakdown</h3>
      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-900 text-white text-xs font-semibold tracking-wider">
              <th class="py-3 px-4">#</th>
              <th class="py-3 px-4">Part Description</th>
              <th class="py-3 px-4 text-right">Qty</th>
              <th class="py-3 px-4 text-right">Unit Price</th>
              <th class="py-3 px-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <!-- Financial Totals -->
      <div class="mt-8 flex flex-col md:flex-row justify-between items-start gap-6">
        <div class="text-xs text-slate-500 max-w-sm bg-slate-50 p-4 rounded-xl border border-slate-200/60">
          <p class="font-semibold text-slate-700 mb-1">📌 Important Terms:</p>
          <ul class="list-disc list-inside space-y-1">
            <li>Parts are subject to availability at time of payment.</li>
            <li>All prices include standard 15% South African VAT.</li>
            <li>Guaranteed fitment when provided with correct VIN.</li>
          </ul>
        </div>

        <div class="w-full md:w-72 space-y-2 bg-slate-900 text-white p-5 rounded-2xl shadow-lg font-mono">
          <div class="flex justify-between text-xs text-slate-400">
            <span>Subtotal:</span>
            <span>R ${Number(quote.subtotal || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="flex justify-between text-xs text-slate-400">
            <span>VAT (15%):</span>
            <span>R ${Number(quote.vat_amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="border-t border-slate-700 my-2 pt-2 flex justify-between text-base font-bold text-emerald-400">
            <span>Total Amount:</span>
            <span>R ${Number(quote.total_amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="bg-slate-50 border-t border-slate-200 px-8 py-6 text-center text-xs text-slate-500">
      <p class="font-medium text-slate-700">Thank you for your business! 🚗💨</p>
      <p class="mt-1">Generated automatically by WACRM Auto Parts Platform • ${businessName}</p>
    </div>

  </div>

</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (err: any) {
    return new NextResponse(`Failed to render quotation PDF: ${err?.message}`, { status: 500 })
  }
}
