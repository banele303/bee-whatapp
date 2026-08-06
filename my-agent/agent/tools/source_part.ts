import { tool } from 'ai'
import { z } from 'zod'
import { sourceOutOfStockPart } from '@/lib/ai/tools/stagehand-sourcing'

export const sourcePart = tool({
  description: 'Scrape external supplier websites for out-of-stock parts (Goldwagen, Masterparts, Facebook Marketplace).',
  parameters: z.object({
    partName: z.string().describe('Name of part to find'),
    make: z.string().optional().describe('Vehicle make'),
    model: z.string().optional().describe('Vehicle model'),
  }),
  execute: async ({ partName, make, model }: { partName: string; make?: string; model?: string }) => {
    return await sourceOutOfStockPart(partName, make, model)
  },
})
