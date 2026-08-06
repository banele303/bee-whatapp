import { tool } from 'ai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/ai/admin-client'

export const searchCatalog = tool({
  description: 'Search the local auto parts inventory by query, make, model, or year.',
  parameters: z.object({
    query: z.string().describe('Part name, category, or description'),
    make: z.string().optional().describe('Vehicle make (e.g. Toyota, BMW)'),
    model: z.string().optional().describe('Vehicle model (e.g. Hilux, 320i)'),
    year: z.number().optional().describe('Vehicle manufacturing year'),
  }),
  execute: async ({ query, make, model, year }: { query: string; make?: string; model?: string; year?: number }) => {
    const db = supabaseAdmin()
    
    const { data: parts, error } = await db
      .from('parts_catalog')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(5)

    if (error || !parts || parts.length === 0) {
      return { found: false, message: `No local stock found for "${query}". Try external sourcing.` }
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
        stock_qty: p.stock_qty,
      })),
    }
  },
})
