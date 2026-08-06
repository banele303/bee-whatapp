import { tool } from "ai";
import { z } from "zod";

export const getWeather = tool({
  description: "Get the weather in a location",
  parameters: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async ({ location }) => {
    return {
      temperature: 72,
      weather: "Sunny",
      location,
    };
  },
});
