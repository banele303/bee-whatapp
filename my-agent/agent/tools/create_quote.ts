import { tool } from 'ai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/ai/admin-client'

const params = z.object({
  items: z.array(
    z.object({
      sku: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      description: z.string(),
    })
  ),
  customerName: z.string().describe('Customer full name'),
  phoneNumber: z.string().optional().describe('Customer phone number'),
})

export const createQuote = tool({
  description: 'Create a formal ZAR quote with PDF generation for the customer.',
  parameters: params,
  execute: async ({ items, customerName, phoneNumber }: z.infer<typeof params>) => {
    const db = supabaseAdmin()

    const subtotal = items.reduce((acc: number, item) => acc + item.quantity * item.unitPrice, 0)
    const vat = subtotal * 0.15
    const total = subtotal + vat
    const quoteNumber = `QT-${Math.floor(1000 + Math.random() * 9000)}`

    const { data: quote, error } = await db
      .from('quotes_and_invoices')
      .insert({
        quote_number: quoteNumber,
        customer_name: customerName,
        phone_number: phoneNumber || '',
        items,
        subtotal,
        vat_amount: vat,
        total_amount: total,
        status: 'draft',
        currency: 'ZAR',
      })
      .select()
      .single()

    if (error) {
      return { error: 'Failed to generate quote.' }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bee-whatapp.vercel.app'

    return {
      success: true,
      quoteId: quote.id,
      quoteNumber,
      total,
      pdfUrl: `${appUrl}/api/quotes/${quote.id}/download`,
      message: `Quote *${quoteNumber}* created for *${customerName}* (Total: *R ${total.toFixed(2)}* incl. VAT). PDF document dispatched!`,
    }
  },
})
