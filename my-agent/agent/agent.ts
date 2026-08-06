import { createOpenAI } from '@ai-sdk/openai'

// Eve agent runtime configuration
// DeepSeek uses an OpenAI-compatible API endpoint
const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '',
})

export const config = {
  name: 'wacrm-auto-parts-agent',
  description: 'AI Auto Parts Assistant for WhatsApp CRM — inventory search, quote generation, appointment booking, and external sourcing.',
  model: deepseek('deepseek-chat'),
  temperature: 0.3,
  maxSteps: 5,
}
