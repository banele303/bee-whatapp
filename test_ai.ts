import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const deepseek = createOpenAI({ apiKey: 'test' })

async function run() {
  await generateText({
    model: deepseek('deepseek-chat'),
    messages: [{ role: 'user', content: 'test' }],
    maxSteps: 5
  })
}
