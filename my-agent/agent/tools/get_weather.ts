import { z } from 'zod'

export const getWeather = {
  description: 'Get the weather in a location',
  parameters: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ location }: { location: string }) => {
    return {
      temperature: 72,
      weather: 'Sunny',
      location,
    }
  },
}
