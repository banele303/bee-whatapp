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
    const finalApiKey = process.env.DEEPSEEK_API_KEY || apiKey;
    const deepseek = createOpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: finalApiKey,
    })

    let sdkMessages: any[] = mergeConsecutive(messages).map(m => ({
      role: m.role,
      content: m.content,
    }))

    const tools = {
      searchInventory: searchInventoryTool(accountId || '') as any,
      createQuote: createQuoteTool(accountId || '', contactId || '') as any,
      sourceOutOfStock: sourceOutOfStockPartTool as any
    }

    let finalResponseText = ''
    let totalUsage = { prompt: 0, completion: 0, total: 0 }

    for (let i = 0; i < 5; i++) {
      const response = await generateText({
        model: deepseek(model || 'deepseek-chat'),
        system: systemPrompt || undefined,
        messages: sdkMessages,
        tools
      })

      if (response.usage) {
        totalUsage.prompt += (response.usage as any).promptTokens || 0
        totalUsage.completion += (response.usage as any).completionTokens || 0
        totalUsage.total += (response.usage as any).totalTokens || 0
      }

      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolSummaries: string[] = []
        for (const tc of response.toolCalls) {
          const toolFn = (tools as any)[tc.toolName]
          if (toolFn && toolFn.execute) {
            try {
              const res = await toolFn.execute(tc.args || {})
              toolSummaries.push(`Tool "${tc.toolName}" returned:\n${JSON.stringify(res, null, 2)}`)
            } catch (err: any) {
              toolSummaries.push(`Tool "${tc.toolName}" failed: ${err.message}`)
            }
          }
        }

        if (response.text) {
          sdkMessages.push({ role: 'assistant', content: response.text })
        }

        sdkMessages.push({
          role: 'user',
          content: `[System Context - Tool Execution Output]:\n${toolSummaries.join('\n\n')}\n\nPlease formulate a final helpful response for the user using the tool output above.`
        })
      } else {
        finalResponseText = response.text || ''
        break
      }
    }

    const normalizedUsage = normalizeUsage({
      prompt: totalUsage.prompt,
      completion: totalUsage.completion,
      total: totalUsage.total,
    })
    
    return { text: finalResponseText, usage: normalizedUsage }
  } catch (err: any) {
    console.error('DeepSeek generation error:', err)
    if (err instanceof AiError) throw err
    throw toNetworkError(err)
  }
}
