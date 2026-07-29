import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'

export async function sourceOutOfStockPart(partName: string, make?: string, model?: string) {
  const stagehand = new Stagehand({
    env: process.env.BROWSERBASE_API_KEY ? 'BROWSERBASE' : 'LOCAL',
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    modelName: 'deepseek-chat',
    modelClientOptions: {
      apiKey: process.env.DEEPSEEK_API_KEY,
    },
    verbose: 1,
    disablePino: true,
  })

  try {
    await stagehand.init()
    const page = stagehand.context.pages()[0]

    // Example supplier: AutoZone or a dummy supplier site
    await page.goto('https://www.autozone.com')
    
    // We construct a natural language query for Stagehand
    const query = `${make || ''} ${model || ''} ${partName}`.trim()
    
    // Act to search for the part
    await stagehand.act(`Search for "${query}" using the search bar`)
    
    // Extract the top 3 results
    const data = await stagehand.extract(
      'Extract the top 3 part listings with their price and availability',
      z.object({
        listings: z.array(z.object({
          name: z.string(),
          price: z.string(),
          inStock: z.boolean(),
          link: z.string().url()
        }))
      })
    )

    return data.listings
  } catch (error) {
    console.error('[stagehand] Error sourcing part:', error)
    return []
  } finally {
    await stagehand.close()
  }
}
