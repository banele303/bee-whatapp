import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import {
  calculateRiskScore,
  calculateVisitFrequencyScore,
  buildRiskProfilePrompt,
} from '@/lib/healthcare/risk-scorer'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

type Params = { params: Promise<{ contactId: string }> }

/**
 * GET /api/healthcare/risk-profile/[contactId]
 * Fetch the current risk profile for a patient contact.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { supabase, accountId } = await requireRole('viewer')
    const { contactId } = await params

    const { data, error } = await supabase
      .from('patient_risk_profiles')
      .select('*')
      .eq('contact_id', contactId)
      .eq('account_id', accountId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch risk profile' }, { status: 500 })
    }

    return NextResponse.json({ profile: data ?? null })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/healthcare/risk-profile/[contactId]
 * (Re-)generate the patient's risk profile by analyzing all their
 * clinical notes with AI.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`healthcare-risk:${userId}`, RATE_LIMITS.ai)
    if (!limit.success) return rateLimitResponse(limit)

    const { contactId } = await params

    // Fetch all completed notes for this contact
    const { data: notes, error: notesErr } = await supabase
      .from('clinical_notes')
      .select('id, raw_transcript, soap_note, ai_suggestions, red_flags, action_items, created_at')
      .eq('contact_id', contactId)
      .eq('account_id', accountId)
      .in('status', ['in_progress', 'complete'])
      .order('created_at', { ascending: true })

    if (notesErr) {
      return NextResponse.json({ error: 'Failed to fetch patient notes' }, { status: 500 })
    }

    if (!notes || notes.length === 0) {
      return NextResponse.json(
        { error: 'No clinical notes found for this patient. Add and analyze notes first.' },
        { status: 422 },
      )
    }

    // Load AI config
    const { data: aiConfig } = await supabase
      .from('ai_configs')
      .select('api_key, provider, model, is_active')
      .eq('account_id', accountId)
      .maybeSingle()

    if (!aiConfig?.is_active) {
      return NextResponse.json({ error: 'AI must be configured and active.' }, { status: 422 })
    }

    // Build a combined summary of all notes for AI analysis
    const notesSummary = notes
      .map((n, i) => {
        const soap = n.soap_note as Record<string, string> | null
        return [
          `=== Visit ${i + 1} (${new Date(n.created_at).toLocaleDateString('en-ZA')}) ===`,
          soap?.subjective ? `Subjective: ${soap.subjective}` : '',
          soap?.objective ? `Objective: ${soap.objective}` : '',
          soap?.assessment ? `Assessment: ${soap.assessment}` : '',
          soap?.plan ? `Plan: ${soap.plan}` : '',
          n.raw_transcript ? `Raw Transcript Excerpt: ${n.raw_transcript.slice(0, 500)}...` : '',
        ]
          .filter(Boolean)
          .join('\n')
      })
      .join('\n\n')

    const systemPrompt = buildRiskProfilePrompt()

    // Generate risk profile with AI
    let rawResponse: string
    if (aiConfig.provider === 'openai') {
      const openai = createOpenAI({ apiKey: aiConfig.api_key })
      const result = await generateText({
        model: openai(aiConfig.model),
        system: systemPrompt,
        prompt: `Analyze these ${notes.length} consultation records for one patient:\n\n${notesSummary}`,
      })
      rawResponse = result.text
    } else if (aiConfig.provider === 'anthropic') {
      const anthropic = createAnthropic({ apiKey: aiConfig.api_key })
      const result = await generateText({
        model: anthropic(aiConfig.model),
        system: systemPrompt,
        prompt: `Analyze these ${notes.length} consultation records for one patient:\n\n${notesSummary}`,
      })
      rawResponse = result.text
    } else {
      const deepseek = createOpenAI({
        apiKey: aiConfig.api_key,
        baseURL: 'https://api.deepseek.com/v1',
      })
      const result = await generateText({
        model: deepseek(aiConfig.model || 'deepseek-chat'),
        system: systemPrompt,
        prompt: `Analyze these ${notes.length} consultation records for one patient:\n\n${notesSummary}`,
      })
      rawResponse = result.text
    }

    // Parse AI response
    let aiData: {
      chronicConditions: string[]
      medicationHistory: Array<{ name: string; dosage?: string; dateMentioned: string }>
      allergyFlags: string[]
      aiAlerts: Array<{ message: string; severity: string; triggeredAt: string }>
      aiSummary: string
    }

    try {
      const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      aiData = JSON.parse(cleaned)
    } catch {
      aiData = {
        chronicConditions: [],
        medicationHistory: [],
        allergyFlags: [],
        aiAlerts: [],
        aiSummary: 'Unable to generate AI summary at this time. Please try again.',
      }
    }

    // Calculate dates
    const firstNoteDate = new Date(notes[0].created_at)
    const lastNoteDate = new Date(notes[notes.length - 1].created_at)
    const today = new Date()
    const daysSinceFirst = Math.floor((today.getTime() - firstNoteDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysSinceLast = Math.floor((today.getTime() - lastNoteDate.getTime()) / (1000 * 60 * 60 * 24))

    // Check for critical red flags in recent notes
    const recentNote = notes[notes.length - 1]
    const recentRedFlags = (recentNote.red_flags ?? []) as Array<{ severity: string }>
    const hasUrgentFlags = recentRedFlags.some(
      (f) => f.severity === 'critical' || f.severity === 'high'
    )

    const { score, level } = calculateRiskScore(
      aiData.chronicConditions,
      aiData.aiAlerts as Array<{ severity: 'low' | 'medium' | 'high' | 'critical' }>,
      notes.length,
      daysSinceLast,
      hasUrgentFlags,
    )

    const visitFrequencyScore = calculateVisitFrequencyScore(score, notes.length, daysSinceFirst)

    // Upsert the profile
    const profileData = {
      account_id: accountId,
      contact_id: contactId,
      risk_level: level,
      risk_score: score,
      chronic_conditions: aiData.chronicConditions,
      medication_history: aiData.medicationHistory,
      allergy_flags: aiData.allergyFlags,
      ai_alerts: aiData.aiAlerts,
      ai_summary: aiData.aiSummary,
      visit_frequency_score: visitFrequencyScore,
      total_consultations: notes.length,
      last_analyzed_at: new Date().toISOString(),
    }

    const { data: profile, error: upsertErr } = await supabase
      .from('patient_risk_profiles')
      .upsert(profileData, { onConflict: 'contact_id' })
      .select()
      .single()

    if (upsertErr) {
      console.error('[healthcare/risk-profile POST]', upsertErr)
      return NextResponse.json({ error: 'Failed to save risk profile' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (err) {
    return toErrorResponse(err)
  }
}
