import { z } from 'zod'

import { supabaseAdmin } from '@/lib/ai/admin-client'
import { sourceOutOfStockPart } from './stagehand-sourcing'
import { sendMessageToConversation } from '@/lib/whatsapp/send-message'
import { sanitizePhoneForMeta } from '@/lib/whatsapp/phone-utils'

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
    
    const { data: parts, error } = await rpcQuery.limit(5)

    if (error) {
      console.error('[tools] searchInventory failed:', error)
      return { error: 'Failed to search inventory.' }
    }

    if (!parts || parts.length === 0) {
      return { found: false, message: `No local stock found for "${query}". Recommending external sourcing.` }
    }

    return {
      found: true,
      count: parts.length,
      parts: parts.map((p) => ({
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        price: p.selling_price,
        in_stock: p.stock_qty > 0,
        stock_qty: p.stock_qty
      }))
    }
  },
})

export const createQuoteTool = (accountId: string, contactId?: string) => ({
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
    const vat = subtotal * 0.15 // 15% SA VAT
    const total = subtotal + vat

    const quoteNumber = `QT-${Math.floor(1000 + Math.random() * 9000)}`

    const { data: quote, error } = await db
      .from('quotes_and_invoices')
      .insert({
        account_id: accountId,
        contact_id: contactId || null,
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
      quoteId: quote.id,
      quoteNumber, 
      subtotal,
      vat,
      total, 
      customerName,
      phoneNumber: phoneNumber || null,
      message: `Quote ${quoteNumber} created successfully for ${customerName} for a total of R ${total.toFixed(2)} (incl. 15% VAT).`
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
    const result = await sourceOutOfStockPart(partName, make, model)
    const mockSessionId = `browserbase-session-${Date.now().toString(36)}`
    return {
      ...result,
      sessionId: mockSessionId,
    }
  }
}

export const sendWhatsAppMessageTool = (accountId: string) => ({
  description: 'Send a WhatsApp text message or quote notification directly to a customer phone number.',
  parameters: z.object({
    phoneNumber: z.string().describe('Recipient phone number in E.164 or local format'),
    message: z.string().describe('Message content to send via WhatsApp'),
    customerName: z.string().optional().describe('Customer name'),
  }),
  inputSchema: z.object({
    phoneNumber: z.string().describe('Recipient phone number in E.164 or local format'),
    message: z.string().describe('Message content to send via WhatsApp'),
    customerName: z.string().optional().describe('Customer name'),
  }),
  execute: async ({ phoneNumber, message, customerName }: { phoneNumber: string; message: string; customerName?: string }) => {
    const db = supabaseAdmin()
    const sanitized = sanitizePhoneForMeta(phoneNumber)

    // 1. Find or create contact
    let { data: contact } = await db
      .from('contacts')
      .select('*')
      .eq('account_id', accountId)
      .eq('phone', sanitized)
      .maybeSingle()

    if (!contact) {
      const { data: newContact, error: cErr } = await db
        .from('contacts')
        .insert({
          account_id: accountId,
          phone: sanitized,
          name: customerName || sanitized,
        })
        .select()
        .single()

      if (cErr || !newContact) {
        return { success: false, error: `Failed to create contact for ${sanitized}: ${cErr?.message}` }
      }
      contact = newContact
    }

    // 2. Find or create conversation
    let { data: conv } = await db
      .from('conversations')
      .select('*')
      .eq('account_id', accountId)
      .eq('contact_id', contact.id)
      .maybeSingle()

    if (!conv) {
      const { data: newConv, error: convErr } = await db
        .from('conversations')
        .insert({
          account_id: accountId,
          contact_id: contact.id,
          status: 'open',
        })
        .select()
        .single()

      if (convErr || !newConv) {
        return { success: false, error: `Failed to create conversation: ${convErr?.message}` }
      }
      conv = newConv
    }

    // 3. Dispatch via WhatsApp
    try {
      const sendResult = await sendMessageToConversation(db, accountId, {
        conversationId: conv.id,
        messageType: 'text',
        contentText: message,
      })

      return {
        success: true,
        whatsappMessageId: sendResult.whatsappMessageId,
        message: `WhatsApp message successfully dispatched to ${sanitized}.`,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to send WhatsApp message',
      }
    }
  },
})

