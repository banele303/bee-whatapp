import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { buildSOAPSystemPrompt, parseSOAPResponse, quickScanRedFlags } from '@/lib/healthcare/soap-parser'
import { loadAiConfig } from '@/lib/ai/config'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/healthcare/notes/[id]/analyze
 *
 * Analyzes the raw_transcript of a clinical note using AI and
 * writes back the structured SOAP note, suggestions, red flags,
 * and action items.
 *
 * Also runs a quick keyword red-flag scan BEFORE the LLM call
 * as a safety net.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`healthcare-analyze:${userId}`, RATE_LIMITS.ai)
    if (!limit.success) return rateLimitResponse(limit)

    const { id } = await params

    // Fetch the note
    const { data: note, error: noteErr } = await supabase
      .from('clinical_notes')
      .select('id, raw_transcript, note_type, account_id')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle()

    if (noteErr || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (!note.raw_transcript || note.raw_transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'No transcript to analyze. Please add transcript text first.' },
        { status: 400 },
      )
    }

    // Load the account's AI config
    const aiConfig = await loadAiConfig(supabase, accountId)
    if (!aiConfig || !aiConfig.isActive) {
      return NextResponse.json(
        { error: 'AI is not configured or not active for this account. Go to Settings → AI to set up.' },
        { status: 422 },
      )
    }

    // Determine the healthcare vertical from account settings
    const { data: account } = await supabase
      .from('accounts')
      .select('vertical_type')
      .eq('id', accountId)
      .maybeSingle()

    const vertical =
      account?.vertical_type === 'dentist' ? 'dentist' :
      account?.vertical_type === 'medspa' ? 'medspa' : 'general'

    // Quick keyword safety scan before LLM
    const quickFlags = quickScanRedFlags(note.raw_transcript)

    // Build system prompt
    const systemPrompt = buildSOAPSystemPrompt(vertical)

    // Call the AI provider via OpenAI-compatible API
    const { createOpenAI } = await import('@ai-sdk/openai')
    const { createAnthropic } = await import('@ai-sdk/anthropic')
    const { generateText } = await import('ai')

    let rawResponse: string

    const providerOptions = {
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      system: systemPrompt,
      prompt: `Analyze the following consultation transcript and return the structured JSON:\n\n---\n${note.raw_transcript}\n---`,
      maxTokens: 2000,
    }

    if (aiConfig.provider === 'openai') {
      const openai = createOpenAI({ apiKey: aiConfig.apiKey })
      const result = await generateText({
        model: openai(aiConfig.model),
        system: providerOptions.system,
        prompt: providerOptions.prompt,
      })
      rawResponse = result.text
    } else if (aiConfig.provider === 'anthropic') {
      const anthropic = createAnthropic({ apiKey: aiConfig.apiKey })
      const result = await generateText({
        model: anthropic(aiConfig.model),
        system: providerOptions.system,
        prompt: providerOptions.prompt,
      })
      rawResponse = result.text
    } else {
      // DeepSeek — use OpenAI-compatible endpoint
      const deepseek = createOpenAI({
        apiKey: aiConfig.apiKey,
        baseURL: 'https://api.deepseek.com/v1',
      })
      const result = await generateText({
        model: deepseek(aiConfig.model || 'deepseek-chat'),
        system: providerOptions.system,
        prompt: providerOptions.prompt,
      })
      rawResponse = result.text
    }

    // Parse the AI response
    const analysis = parseSOAPResponse(rawResponse)

    // Merge quick-scan flags with AI-detected flags (deduplicate by symptom)
    const existingFlagSymptoms = new Set(analysis.redFlags.map((f) => f.symptom))
    for (const flag of quickFlags) {
      if (!existingFlagSymptoms.has(flag.symptom)) {
        analysis.redFlags.push(flag)
      }
    }

    // Write results back to the note
    const { data: updated, error: updateErr } = await supabase
      .from('clinical_notes')
      .update({
        soap_note: analysis.soapNote,
        ai_suggestions: analysis.aiSuggestions,
        action_items: analysis.actionItems,
        red_flags: analysis.redFlags,
        status: 'in_progress',
      })
      .eq('id', id)
      .eq('account_id', accountId)
      .select()
      .single()

    if (updateErr) {
      console.error('[healthcare/notes/analyze POST]', updateErr)
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    return NextResponse.json({
      note: updated,
      analysis,
      shortSummary: analysis.shortSummary,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
