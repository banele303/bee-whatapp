import { z } from 'zod'

import { supabaseAdmin } from '@/lib/ai/admin-client'
import { sourceOutOfStockPart } from './stagehand-sourcing'



// Tool to search the parts catalog and vehicle fitments
export const searchInventoryTool = (accountId: string) => ({
  description: 'Search the auto parts catalog by part name, SKU, or vehicle fitment (make, model, year). Returns matching parts, prices, and stock quantity.',
  parameters: z.object({
    query: z.string().describe('Search query for part name, category, or description.'),
    make: z.string().optional().describe('Vehicle make (e.g. Toyota)'),
    model: z.string().optional().describe('Vehicle model (e.g. Corolla)'),
    year: z.number().optional().describe('Vehicle year (e.g. 2016)'),
  }),
  inputSchema: z.object({
    query: z.string().describe('Search query for part name, category, or description.'),
    make: z.string().optional().describe('Vehicle make (e.g. Toyota)'),
    model: z.string().optional().describe('Vehicle model (e.g. Corolla)'),
    year: z.number().optional().describe('Vehicle year (e.g. 2016)'),
  }),
  execute: async ({ query, make, model, year }: { query: string; make?: string; model?: string; year?: number }) => {
    const db = supabaseAdmin()
    
    // Simple text search on parts catalog
    let rpcQuery = db
      .from('parts_catalog')
      .select('*')
      .eq('account_id', accountId)

    if (query) {
      rpcQuery = rpcQuery.ilike('name', `%${query}%`)
    }
    
    // For a real SaaS, we would do a more complex JOIN with vehicles_fitment,
    // but for now we rely on simple ILIKE search or metadata filtering.
    // Limit to 5 results to keep context window small.
    const { data: parts, error } = await rpcQuery.limit(5)

    if (error) {
      console.error('[tools] searchInventory failed:', error)
      return { error: 'Failed to search inventory.' }
    }

    if (!parts || parts.length === 0) {
      return { message: 'No parts found matching the query.' }
    }

    return parts.map((p) => ({
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      price: p.selling_price,
      in_stock: p.stock_qty > 0,
      stock_qty: p.stock_qty
    }))
  },
})

export const createQuoteTool = (accountId: string, contactId: string) => ({
  description: 'Create a formal quote for the customer. Use this when the customer wants to buy a part or asks for a price estimate.',
  parameters: z.object({
    items: z.array(z.object({
      sku: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      description: z.string(),
    })),
    customerName: z.string().describe('The name of the customer, if known, else use a placeholder like "Valued Customer"'),
    phoneNumber: z.string().optional().describe('The customer phone number'),
  }),
  inputSchema: z.object({
    items: z.array(z.object({
      sku: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      description: z.string(),
    })),
    customerName: z.string().describe('The name of the customer, if known, else use a placeholder like "Valued Customer"'),
    phoneNumber: z.string().optional().describe('The customer phone number'),
  }),
  execute: async ({ items, customerName, phoneNumber }: { items: any[]; customerName: string; phoneNumber?: string }) => {
    const db = supabaseAdmin()

    const subtotal = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0)
    const vat = subtotal * 0.15 // Example 15% VAT
    const total = subtotal + vat

    const quoteNumber = `QT-${Math.floor(1000 + Math.random() * 9000)}`

    const { data: quote, error } = await db
      .from('quotes_and_invoices')
      .insert({
        account_id: accountId,
        contact_id: contactId,
        quote_number: quoteNumber,
        customer_name: customerName,
        phone_number: phoneNumber || '',
        items,
        subtotal,
        vat_amount: vat,
        total_amount: total,
        status: 'draft',
        currency: 'ZAR'
      })
      .select()
      .single()

    if (error) {
      console.error('[tools] createQuote failed:', error)
      return { error: 'Failed to create quote.' }
    }

    return { 
      success: true, 
      quoteNumber, 
      total, 
      message: `Quote ${quoteNumber} created successfully for ${customerName} for a total of ${total}. Provide this quote number to the customer.`
    }
  }
})

export const sourceOutOfStockPartTool = {
  description: 'Use this tool when a part is out of stock in the local catalog. It will use a scraping agent to find the part on external supplier sites.',
  parameters: z.object({
    partName: z.string().describe('Name of the part to source'),
    make: z.string().optional().describe('Vehicle make'),
    model: z.string().optional().describe('Vehicle model'),
  }),
  inputSchema: z.object({
    partName: z.string().describe('Name of the part to source'),
    make: z.string().optional().describe('Vehicle make'),
    model: z.string().optional().describe('Vehicle model'),
  }),
  execute: async ({ partName, make, model }: { partName: string; make?: string; model?: string }) => {
    return await sourceOutOfStockPart(partName, make, model)
  }
}
