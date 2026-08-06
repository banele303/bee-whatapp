import { tool } from 'ai'
import { z } from 'zod'

const params = z.object({
  location: z.string().describe('The location to get the weather for'),
})

export const getWeather = tool({
  description: 'Get the weather in a location',
  parameters: params,
  execute: async ({ location }: z.infer<typeof params>) => {
    return {
      temperature: 72,
      weather: 'Sunny',
      location,
    }
  },
})
