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
import { HANDOFF_SENTINEL } from '../defaults'

/**
 * Call OpenAI's Chat Completions endpoint with the caller's own key.
 * Now integrated with Vercel AI SDK to support tools for the Auto Parts SaaS.
 */
export async function generateOpenAi(args: ProviderArgs): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages, timeoutMs, accountId, contactId } = args as ProviderArgs & { accountId?: string; contactId?: string }

  try {
    const openai = createOpenAI({
      apiKey,
    })

    // Convert messages to Vercel AI SDK format
    const sdkMessages = mergeConsecutive(messages).map(m => ({
      role: m.role,
      content: m.content,
    }))

    const { text, usage, finishReason } = await generateText({
      model: openai(model),
      system: systemPrompt,
      messages: sdkMessages,
      maxSteps: 5,
      tools: {
        searchInventory: searchInventoryTool(accountId || '') as any,
        createQuote: createQuoteTool(accountId || '', contactId || '') as any,
        sourceOutOfStock: sourceOutOfStockPartTool as any
      }
    })

    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new AiError('OpenAI returned an empty response.', {
        code: 'empty_response',
      })
    }
    
    const normalizedUsage = normalizeUsage({
      prompt: (usage as any)?.promptTokens,
      completion: (usage as any)?.completionTokens,
      total: (usage as any)?.totalTokens,
    })
    
    return { text, usage: normalizedUsage }
  } catch (err: any) {
    console.error('OpenAI generation error:', err)
    if (err instanceof AiError) throw err
    throw toNetworkError(err)
  }
}
