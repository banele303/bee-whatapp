import { tool } from 'ai'
import { z } from 'zod'
import { sourceOutOfStockPart } from '@/lib/ai/tools/stagehand-sourcing'

const params = z.object({
  partName: z.string().describe('Name of part to find'),
  make: z.string().optional().describe('Vehicle make'),
  model: z.string().optional().describe('Vehicle model'),
})

export const sourcePart = tool({
  description: 'Scrape external supplier websites for out-of-stock parts (Goldwagen, Masterparts, Facebook Marketplace).',
  parameters: params,
  execute: async ({ partName, make, model }: z.infer<typeof params>) => {
    return await sourceOutOfStockPart(partName, make, model)
  },
})
