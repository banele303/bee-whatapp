import { AiError, type ProviderResult } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  mergeConsecutive,
  normalizeUsage,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { searchInventoryTool, createQuoteTool, sourceOutOfStockPartTool } from '../tools/parts-tools'

/**
 * Call DeepSeek's Chat Completions endpoint (OpenAI-compatible) with the key.
 * Now integrated with Vercel AI SDK to support tools for the Auto Parts SaaS.
 */
export async function generateDeepSeek(args: ProviderArgs): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages, timeoutMs, accountId, contactId } = args

  try {
    const deepseek = createOpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey,
    })

    // Convert messages to Vercel AI SDK format
    const sdkMessages = mergeConsecutive(messages).map(m => ({
      role: m.role,
      content: m.content,
    }))

    const { text, usage } = await generateText({
      model: deepseek(model || 'deepseek-chat'),
      system: systemPrompt,
      messages: sdkMessages,
      tools: {
        searchInventory: searchInventoryTool(accountId || '') as any,
        createQuote: createQuoteTool(accountId || '', contactId || '') as any,
        sourceOutOfStock: sourceOutOfStockPartTool as any
      },
      maxSteps: 5
    })

    const normalizedUsage = normalizeUsage({
      prompt: (usage as any)?.promptTokens,
      completion: (usage as any)?.completionTokens,
      total: (usage as any)?.totalTokens,
    })
    
    return { text, usage: normalizedUsage }
  } catch (err: any) {
    console.error('DeepSeek generation error:', err)
    if (err instanceof AiError) throw err
    throw toNetworkError(err)
  }
}
